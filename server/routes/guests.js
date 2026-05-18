import { Router } from 'express';
import prisma from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(__dirname, '../../uploads/guests'), limits: { fileSize: 30 * 1024 * 1024 } });
const router = Router();

// Simple password middleware
const GUEST_PASSWORD = process.env.GUEST_PASSWORD || 'afhu2026';

function authMiddleware(req, res, next) {
  const token = req.headers['x-guest-auth'];
  if (token === GUEST_PASSWORD) return next();
  res.status(401).json({ error: 'Accesso non autorizzato' });
}

// POST login
router.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password === GUEST_PASSWORD) {
    res.json({ ok: true, token: GUEST_PASSWORD });
  } else {
    res.status(401).json({ error: 'Password errata' });
  }
});

// Apply auth to all other routes
router.use(authMiddleware);

// GET all guests
router.get('/', async (req, res) => {
  try {
    const guests = await prisma.guest.findMany({
      include: { companions: true, flights: true },
      orderBy: { lastName: 'asc' }
    });
    res.json(guests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single guest
router.get('/:id', async (req, res) => {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: req.params.id },
      include: { companions: true, flights: { orderBy: { direction: 'asc' } } }
    });
    if (!guest) return res.status(404).json({ error: 'Ospite non trovato' });
    res.json(guest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create guest
router.post('/', async (req, res) => {
  try {
    const { companions, flights, ...guestData } = req.body;
    const guest = await prisma.guest.create({
      data: {
        ...guestData,
        checkInDate: guestData.checkInDate ? new Date(guestData.checkInDate) : null,
        checkOutDate: guestData.checkOutDate ? new Date(guestData.checkOutDate) : null,
        companions: companions?.length ? { create: companions } : undefined,
        flights: flights?.length ? {
          create: flights.map(f => ({
            ...f,
            date: f.date ? new Date(f.date) : null,
            arrivalDay: f.arrivalDay ? new Date(f.arrivalDay) : null
          }))
        } : undefined
      },
      include: { companions: true, flights: true }
    });
    res.status(201).json(guest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update guest
router.put('/:id', async (req, res) => {
  try {
    const { companions, flights, id, createdAt, updatedAt, ...guestData } = req.body;
    const guest = await prisma.guest.update({
      where: { id: req.params.id },
      data: {
        ...guestData,
        checkInDate: guestData.checkInDate ? new Date(guestData.checkInDate) : null,
        checkOutDate: guestData.checkOutDate ? new Date(guestData.checkOutDate) : null,
      },
      include: { companions: true, flights: true }
    });
    res.json(guest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE guest
router.delete('/:id', async (req, res) => {
  try {
    await prisma.guest.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add companion
router.post('/:id/companions', async (req, res) => {
  try {
    const companion = await prisma.guestCompanion.create({
      data: { guestId: req.params.id, ...req.body }
    });
    res.status(201).json(companion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE companion
router.delete('/:guestId/companions/:compId', async (req, res) => {
  try {
    await prisma.guestCompanion.delete({ where: { id: req.params.compId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add flight
router.post('/:id/flights', async (req, res) => {
  try {
    const flight = await prisma.guestFlight.create({
      data: {
        guestId: req.params.id,
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : null,
        arrivalDay: req.body.arrivalDay ? new Date(req.body.arrivalDay) : null
      }
    });
    res.status(201).json(flight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE flight
router.delete('/:guestId/flights/:flightId', async (req, res) => {
  try {
    await prisma.guestFlight.delete({ where: { id: req.params.flightId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// IMPORT: Upload and parse Excel file
// ============================================================
router.post('/import/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file fornito' });

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const ext = path.extname(fileName).toLowerCase();

    let parsedGuests = [];

    if (ext === '.xlsx' || ext === '.xls') {
      // Smart Excel pre-processing: clean data before sending to AI
      const XLSX = (await import('xlsx')).default;
      const workbook = XLSX.readFile(filePath);

      let allText = '';
      for (const sheetName of workbook.SheetNames) {
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
        if (!rawRows || rawRows.length < 2) continue;

        // Detect header structure: survey sheets often have 2 header rows
        // Row 0 = group headers (long text), Row 1 = field names (short text)
        let headerRowIdx = 0;
        let headers = [];

        const row0 = rawRows[0] || [];
        const row1 = rawRows[1] || [];

        // Count meaningful (non-empty, non-nbsp) cells in each row
        const isReal = v => v && String(v).trim() && String(v).trim() !== '\xa0';
        const row0Real = row0.filter(isReal);
        const row1Real = row1.filter(v => isReal(v) && String(v).length > 1 && String(v).length < 100);

        // Two-row header detection:
        // Row 1 has significantly more field-like values than Row 0, OR
        // Row 0 has long text (group headers) and Row 1 has short field names
        const row0AvgLen = row0Real.length > 0 ? row0Real.reduce((a, v) => a + String(v).length, 0) / row0Real.length : 0;
        const isTwoRowHeader = (row1Real.length > row0Real.length * 1.5 && row1Real.length > 5) ||
                               (row0AvgLen > 40 && row1Real.length > 5);

        if (isTwoRowHeader) {
          // Two-row headers (like SurveyMonkey): use row 1 as field names
          // Add context from row 0 group headers to disambiguate duplicates
          headerRowIdx = 1;
          let lastGroup = '';
          const seenNames = {};
          headers = row1.map((v, i) => {
            // Track the current group from row 0
            const grp = String(row0[i] || '').trim();
            if (grp && grp !== '\xa0' && grp.length > 2) {
              // Extract short context from group header
              if (grp.toLowerCase().includes('emergency')) lastGroup = 'Emergency';
              else if (grp.toLowerCase().includes('assistant')) lastGroup = 'Assistant';
              else if (grp.toLowerCase().includes('+1') || grp.toLowerCase().includes('accompanying')) lastGroup = 'Companion';
              else if (grp.toLowerCase().includes('arrival') || grp.toLowerCase().includes('commence')) lastGroup = 'Arrival';
              else if (grp.toLowerCase().includes('departure')) lastGroup = 'Departure';
              else if (grp.toLowerCase().includes('passport')) lastGroup = 'Passport';
              else if (grp.toLowerCase().includes('contact')) lastGroup = 'Contact';
              else if (grp.toLowerCase().includes('hotel') || grp.toLowerCase().includes('upgrade')) lastGroup = 'Hotel Upgrade';
              else if (grp.toLowerCase().includes('whatsapp')) lastGroup = 'WhatsApp';
              else if (grp.toLowerCase().includes('dietary')) lastGroup = 'Dietary';
              else if (grp.toLowerCase().includes('mobility')) lastGroup = 'Mobility';
              else if (grp.toLowerCase().includes('medical')) lastGroup = 'Medical';
              else if (grp.toLowerCase().includes('privacy')) lastGroup = 'Privacy';
              else if (grp.toLowerCase().includes('image')) lastGroup = 'ImageRights';
              else if (grp.toLowerCase().includes('cancellation')) lastGroup = 'Cancellation';
              else if (grp.toLowerCase().includes('liability') || grp.toLowerCase().includes('assumption')) lastGroup = 'Liability';
              else if (grp.toLowerCase().includes('insurance')) lastGroup = 'Insurance';
              else if (grp.toLowerCase().includes('comment') || grp.toLowerCase().includes('special')) lastGroup = 'Comments';
            }

            let name = String(v || '').trim();
            if (!name || name === '\xa0') return '';

            // Replace generic "Response" with group context
            if (name.toLowerCase() === 'response' && lastGroup) {
              name = `${lastGroup} Consent`;
            }

            // Disambiguate duplicate field names with group context
            if (seenNames[name]) {
              name = lastGroup ? `${lastGroup} ${name}` : `${name} ${seenNames[name] + 1}`;
            }
            seenNames[name] = (seenNames[name] || 0) + 1;

            return name;
          });
        } else {
          headers = row0.map(v => String(v || '').trim());
        }

        // Filter out useless columns: consent forms, legal, image uploads, privacy, etc.
        // Skip only truly useless columns (image uploads, empty headers)
        // KEEP: consent/privacy/whatsapp columns — user wants these tracked
        const skipPatterns = [
          /passport.*upload/i, /^open-ended response$/i,
          /^\s*$/, /^\xa0$/
        ];

        const keepIndices = [];
        const cleanHeaders = [];
        headers.forEach((h, i) => {
          if (!h || h === '\xa0' || h === ' ') return;
          if (skipPatterns.some(p => p.test(h))) return;
          // Skip "Yes, I have read..." type consent value columns
          if (h.startsWith('Yes, I')) return;
          keepIndices.push(i);
          cleanHeaders.push(h);
        });

        // Build clean data rows as JSON objects
        const dataStartRow = headerRowIdx + 1;
        const dataRows = rawRows.slice(dataStartRow);

        allText += `=== FOGLIO: ${sheetName} ===\n`;

        if (cleanHeaders.length > 0 && keepIndices.length > 0) {
          // Output as structured records
          for (const row of dataRows) {
            const record = {};
            let hasData = false;
            keepIndices.forEach((colIdx, i) => {
              let val = row[colIdx];
              if (val === undefined || val === null || val === '' || val === '\xa0') return;
              val = String(val).trim();
              if (!val) return;
              // Skip consent/agreement values in data cells too
              if (val.startsWith('Yes, I have read') || val.startsWith('Yes, I accept')) return;
              record[cleanHeaders[i]] = val;
              hasData = true;
            });
            // Skip rows with only 1 field (summary rows like total counts)
            if (hasData && Object.keys(record).length > 1) {
              allText += JSON.stringify(record) + '\n';
            }
          }
        } else {
          // Fallback: simple CSV for sheets with unclear structure
          const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
          allText += csv.substring(0, 8000);
        }

        allText += '\n\n';
      }

      if (!allText.trim()) {
        return res.status(400).json({ error: 'Il file Excel non contiene dati leggibili.' });
      }

      parsedGuests = await aiParseGuestData(allText, 'EXCEL');
    } else if (ext === '.pdf') {
      // AI-powered PDF parsing using Claude
      const pdfParse = (await import('pdf-parse')).default;
      const buf = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buf);
      const pdfText = pdfData.text;

      if (!pdfText || pdfText.trim().length < 10) {
        return res.status(400).json({ error: 'Il PDF non contiene testo estraibile.' });
      }

      parsedGuests = await aiParseGuestData(pdfText, 'PDF');
    }

    // Clean up
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

    if (parsedGuests.length === 0) {
      return res.status(400).json({ error: 'Nessun ospite trovato nel file. Verifica il contenuto del file e riprova.' });
    }

    // Save import record
    const importRecord = await prisma.guestImport.create({
      data: {
        fileName,
        fileType: ext === '.pdf' ? 'PDF' : 'EXCEL',
        status: 'PENDING',
        data: parsedGuests
      }
    });

    res.json({ importId: importRecord.id, guests: parsedGuests, count: parsedGuests.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST confirm import
router.post('/import/:importId/confirm', async (req, res) => {
  try {
    const { guests } = req.body; // edited guest data from frontend
    const results = [];

    for (const g of guests) {
      const { companions, flights, _rawText, _type, title, organization, id, createdAt, updatedAt, ...guestData } = g;

      // Merge title/organization into bio if present (AI-extracted fields)
      if (title || organization) {
        const parts = [title, organization, guestData.bio].filter(Boolean);
        guestData.bio = parts.join(' — ');
      }

      // Clean dates
      if (guestData.checkInDate) guestData.checkInDate = new Date(guestData.checkInDate);
      else guestData.checkInDate = null;
      if (guestData.checkOutDate) guestData.checkOutDate = new Date(guestData.checkOutDate);
      else guestData.checkOutDate = null;

      // Ensure correct types
      guestData.hotelRoomsNeeded = guestData.hotelRoomsNeeded ? parseInt(guestData.hotelRoomsNeeded) : null;
      guestData.whatsappOptIn = guestData.whatsappOptIn === true;
      guestData.healthAttestation = guestData.healthAttestation === true;
      guestData.privacyConsent = guestData.privacyConsent === true;
      guestData.imageRightsConsent = guestData.imageRightsConsent === true;
      guestData.liabilityConsent = guestData.liabilityConsent === true;
      guestData.cancellationConsent = guestData.cancellationConsent === true;
      guestData.insuranceConsent = guestData.insuranceConsent === true;

      const created = await prisma.guest.create({
        data: {
          ...guestData,
          companions: companions?.length ? {
            create: companions.map(c => ({
              fullName: c.fullName,
              relationship: c.relationship || null,
              notes: c.notes || null
            }))
          } : undefined,
          flights: flights?.length ? {
            create: flights.map(f => ({
              direction: f.direction || 'ARRIVAL',
              departureAirport: f.departureAirport || null,
              arrivalAirport: f.arrivalAirport || null,
              airline: f.airline || null,
              flightNumber: f.flightNumber || null,
              date: f.date ? new Date(f.date) : null,
              departureTime: f.departureTime || null,
              arrivalDay: f.arrivalDay ? new Date(f.arrivalDay) : null,
              arrivalTime: f.arrivalTime || null
            }))
          } : undefined
        },
        include: { companions: true, flights: true }
      });
      results.push(created);
    }

    // Update import status
    await prisma.guestImport.update({
      where: { id: req.params.importId },
      data: { status: 'CONFIRMED' }
    });

    res.json({ imported: results.length, guests: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// EMAIL GENERATORS
// ============================================================

// POST generate Meet & Greet email
router.post('/email/meet-greet', async (req, res) => {
  try {
    const { guestIds, language } = req.body;
    const lang = language || 'en';

    const guests = await prisma.guest.findMany({
      where: guestIds?.length ? { id: { in: guestIds } } : {},
      include: { companions: true, flights: { where: { direction: 'ARRIVAL' } } },
      orderBy: [{ lastName: 'asc' }]
    });

    // Group by arrival date/flight
    const byDate = {};
    for (const g of guests) {
      for (const f of g.flights) {
        const dateKey = f.arrivalDay ? new Date(f.arrivalDay).toISOString().split('T')[0] : f.date ? new Date(f.date).toISOString().split('T')[0] : 'TBD';
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push({ guest: g, flight: f });
      }
      if (g.flights.length === 0) {
        if (!byDate['TBD']) byDate['TBD'] = [];
        byDate['TBD'].push({ guest: g, flight: null });
      }
    }

    let emailText = lang === 'it'
      ? 'Gentili,\n\ndi seguito i dettagli degli ospiti in arrivo per il servizio di Meet & Greet:\n\n'
      : 'Dear Team,\n\nPlease find below the arriving guest details for Meet & Greet service:\n\n';

    const sortedDates = Object.keys(byDate).sort();
    for (const date of sortedDates) {
      const dateLabel = date === 'TBD' ? 'Date TBD' : formatDateEmail(date);
      emailText += `═══════════════════════════════════\n`;
      emailText += `📅 ${dateLabel}\n`;
      emailText += `═══════════════════════════════════\n\n`;

      for (const { guest, flight } of byDate[date]) {
        const totalPeople = 1 + (guest.companions?.length || 0);
        const companionNames = guest.companions?.map(c => c.fullName).join(', ');

        emailText += `👤 ${guest.firstName} ${guest.lastName}`;
        if (companionNames) emailText += ` + ${companionNames}`;
        emailText += `\n`;
        emailText += `   Total persons: ${totalPeople}\n`;

        if (flight) {
          emailText += `   ✈️ Flight: ${flight.airline || ''} ${flight.flightNumber || 'N/A'}`;
          emailText += ` (${flight.departureAirport || '?'} → ${flight.arrivalAirport || '?'})`;
          emailText += `\n`;
          if (flight.arrivalTime) emailText += `   🕐 Arrival time: ${flight.arrivalTime}\n`;
          else if (flight.departureTime) emailText += `   🕐 Departure time: ${flight.departureTime}\n`;
        } else {
          emailText += `   ✈️ Flight details: TBD\n`;
        }

        if (guest.specialRequests) {
          emailText += `   ⚠️ Notes: ${guest.specialRequests}\n`;
        }
        if (guest.mobilityNeeds && guest.mobilityNeeds.toLowerCase() !== 'none') {
          emailText += `   ♿ Mobility: ${guest.mobilityNeeds}\n`;
        }
        emailText += `\n`;
      }
    }

    emailText += lang === 'it'
      ? `───────────────────────────────────\nTotale ospiti: ${guests.length} (+ accompagnatori)\n\nGrazie,\nCordiali saluti`
      : `───────────────────────────────────\nTotal guests: ${guests.length} (+ companions)\n\nThank you,\nBest regards`;

    res.json({ email: emailText, guestCount: guests.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST generate Transportation email
router.post('/email/transportation', async (req, res) => {
  try {
    const { guestIds, language } = req.body;
    const lang = language || 'en';

    const guests = await prisma.guest.findMany({
      where: guestIds?.length ? { id: { in: guestIds } } : {},
      include: { companions: true, flights: { where: { direction: 'ARRIVAL' } } },
      orderBy: [{ lastName: 'asc' }]
    });

    // Group by arrival date
    const byDate = {};
    for (const g of guests) {
      for (const f of g.flights) {
        const dateKey = f.arrivalDay ? new Date(f.arrivalDay).toISOString().split('T')[0] : f.date ? new Date(f.date).toISOString().split('T')[0] : 'TBD';
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push({ guest: g, flight: f });
      }
      if (g.flights.length === 0) {
        if (!byDate['TBD']) byDate['TBD'] = [];
        byDate['TBD'].push({ guest: g, flight: null });
      }
    }

    let emailText = lang === 'it'
      ? 'Gentili,\n\ndi seguito i dettagli dei trasferimenti aeroporto → hotel per gli ospiti:\n\n'
      : 'Dear Team,\n\nPlease find below the airport → hotel transfer details for our guests:\n\n';

    const sortedDates = Object.keys(byDate).sort();
    for (const date of sortedDates) {
      const dateLabel = date === 'TBD' ? 'Date TBD' : formatDateEmail(date);
      emailText += `═══════════════════════════════════\n`;
      emailText += `📅 ${dateLabel}\n`;
      emailText += `═══════════════════════════════════\n\n`;

      // Sort by arrival time
      const sorted = byDate[date].sort((a, b) => {
        const ta = a.flight?.arrivalTime || a.flight?.departureTime || 'ZZ';
        const tb = b.flight?.arrivalTime || b.flight?.departureTime || 'ZZ';
        return ta.localeCompare(tb);
      });

      for (const { guest, flight } of sorted) {
        const totalPeople = 1 + (guest.companions?.length || 0);
        const companionNames = guest.companions?.map(c => c.fullName).join(', ');
        const hotel = guest.roomType ? `(${guest.roomType})` : '';

        emailText += `👤 ${guest.firstName} ${guest.lastName}`;
        if (companionNames) emailText += ` + ${companionNames}`;
        emailText += `\n`;
        emailText += `   Total persons: ${totalPeople}\n`;

        if (flight) {
          emailText += `   ✈️ Flight: ${flight.airline || ''} ${flight.flightNumber || 'N/A'}`;
          emailText += ` (${flight.departureAirport || '?'} → ${flight.arrivalAirport || '?'})`;
          emailText += `\n`;
          if (flight.arrivalTime) emailText += `   🕐 Arrival time: ${flight.arrivalTime}\n`;
        } else {
          emailText += `   ✈️ Flight details: TBD\n`;
        }

        if (guest.checkInDate) {
          emailText += `   🏨 Hotel check-in: ${formatDateEmail(guest.checkInDate)} ${hotel}\n`;
        }

        if (guest.specialRequests) {
          emailText += `   ⚠️ Notes: ${guest.specialRequests}\n`;
        }
        if (guest.mobilityNeeds && guest.mobilityNeeds.toLowerCase() !== 'none') {
          emailText += `   ♿ Mobility: ${guest.mobilityNeeds}\n`;
        }

        emailText += `\n`;
      }
    }

    emailText += lang === 'it'
      ? `───────────────────────────────────\nTotale ospiti: ${guests.length} (+ accompagnatori)\nTotale trasferimenti: ${Object.keys(byDate).length} giorno/i\n\nGrazie,\nCordiali saluti`
      : `───────────────────────────────────\nTotal guests: ${guests.length} (+ companions)\nTotal transfer days: ${Object.keys(byDate).length}\n\nThank you,\nBest regards`;

    res.json({ email: emailText, guestCount: guests.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// AI INSIGHTS
// ============================================================
router.post('/insights', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata' });

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    const guests = await prisma.guest.findMany({
      include: { companions: true, flights: true }
    });

    const guestSummary = guests.map(g => ({
      name: `${g.firstName} ${g.lastName}`,
      companions: g.companions?.map(c => c.fullName),
      flights: g.flights?.map(f => ({
        direction: f.direction,
        flight: `${f.airline} ${f.flightNumber}`,
        from: f.departureAirport,
        to: f.arrivalAirport,
        date: f.date,
        arrivalTime: f.arrivalTime,
        departureTime: f.departureTime
      })),
      dietary: g.dietaryRestrictions,
      mobility: g.mobilityNeeds,
      medical: g.medicalInfo,
      specialRequests: g.specialRequests,
      checkIn: g.checkInDate,
      checkOut: g.checkOutDate,
      roomType: g.roomType,
    }));

    const prompt = `Sei un coordinatore esperto di eventi VIP. Analizza i seguenti dati degli ospiti e genera un report di INSIGHTS e ALERT strutturato in sezioni. Per ogni ospite e per il gruppo nel suo complesso, segnala:

1. **ARRIVI** - Raggruppa per giorno di arrivo. Segnala ospiti che arrivano lo stesso giorno/orario simile (possibilità di raggruppare trasferimenti). Segnala arrivi molto presto o molto tardi.

2. **ALERT FORNITORI** - Suddiviso per categoria:
   - 🏨 HOTEL: Richieste speciali stanze, early check-in, upgrade, letti separati, piani alti, ecc.
   - 🍽️ RISTORANTI: Restrizioni alimentari, allergie, diete particolari - elenca OGNI ospite con le sue specifiche
   - 🚐 TRASPORTI: Esigenze mobilità, wheelchair, assistenza speciale
   - 🤝 MEET & GREET: Note su accoglienza particolari, VIP particolari

3. **ESIGENZE SPECIALI** - Ospiti con necessità mediche, mobilità ridotta, o richieste particolari da tenere monitorate

4. **RIEPILOGO NUMERI** - Totale ospiti, totale persone (con accompagnatori), camere necessarie, voli da monitorare

Rispondi in ITALIANO. Sii preciso e concreto, nomina sempre gli ospiti specifici.

Dati ospiti:
${JSON.stringify(guestSummary, null, 2)}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    res.json({ insights: response.content[0]?.text || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// AI-POWERED IMPORT
// ============================================================

async function aiParseGuestData(rawText, sourceType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurata — impossibile usare AI per il parsing');

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  const prompt = `Sei un sistema esperto di data extraction per la gestione ospiti di un evento VIP. Devi analizzare dati estratti da un file ${sourceType} e creare un profilo completo per ogni PERSONA REALE ospite dell'evento.

CONTESTO IMPORTANTE:
- I dati possono provenire da PIÙ FOGLI Excel (hotel manifest, survey, lista voli, biografie, ecc.)
- Devi INCROCIARE le informazioni tra i fogli per abbinare lo stesso ospite su dati diversi (match per nome/cognome)
- Un foglio può contenere i dati hotel (camere, check-in/out), un altro i dati personali (dieta, passaporto, voli), un altro le biografie

REGOLE CRITICHE PER IDENTIFICARE GLI OSPITI:
1. Un OSPITE è una persona fisica che partecipa all'evento. Ha un nome e un cognome.
2. NON sono ospiti: preferenze alimentari (es. "Kosher", "Vegetarian", "Gluten free"), tipi di camera (es. "Deluxe", "Suite"), status (es. "Confirmed", "Pending"), intestazioni di colonna, note generiche
3. Se una riga contiene "John and Mary Smith" oppure "John & Mary Smith", l'ospite principale è John Smith e Mary Smith va come companion
4. Se il COUNT o numero persone è > 1 ma non c'è nome accompagnatore, aggiungi un companion generico
5. Se ci sono più fogli, INCROCIA i dati: cerca lo stesso nome/cognome nei diversi fogli e UNISCI tutte le informazioni in un unico profilo ospite

COME CLASSIFICARE I DATI:
- "Kosher", "Vegetarian", "No pork", "Allergic to nuts", "Gluten free" → dietaryRestrictions (NON è un ospite!)
- "Wheelchair", "Limited mobility", "Walker needed" → mobilityNeeds
- "Diabetes", "Heart condition", "Takes insulin" → medicalInfo
- "Early check-in", "High floor", "Extra pillows" → specialRequests
- "Deluxe Room", "Suite", "Standard Double" → roomType
- Codici tipo "LH402", "UA123", "AZ610" → flightNumber
- "FCO", "JFK", "EWR", "TLV" → codici aeroporto

FORMATO OUTPUT OBBLIGATORIO:
- Rispondi SOLO con l'array JSON. NESSUN testo prima, dopo, o intorno.
- NESSUN commento, NESSUNA spiegazione, NESSUN markdown (no \`\`\`).
- La tua risposta DEVE iniziare con [ e finire con ]
- Usa valori COMPATTI: evita spazi inutili nei campi stringa

Schema per ogni ospite:
{
  "firstName": "string",
  "lastName": "string",
  "email": "string o null",
  "phone": "string o null",
  "phoneOffice": "string o null",
  "roomType": "string o null",
  "hotelRoomsNeeded": "number o null",
  "checkInDate": "YYYY-MM-DD o null",
  "checkOutDate": "YYYY-MM-DD o null",
  "hotelUpgrade": "string o null",
  "dietaryRestrictions": "string o null",
  "mobilityNeeds": "string o null",
  "medicalInfo": "string o null",
  "specialRequests": "string o null",
  "passportCountry": "string o null",
  "passportNumber": "string o null",
  "passportExpiry": "string o null",
  "dateOfBirth": "string o null",
  "city": "string o null",
  "state": "string o null",
  "zip": "string o null",
  "mailingAddress": "string o null",
  "bio": "biografia della persona o null",
  "title": "titolo professionale o null",
  "organization": "organizzazione o null",
  "whatsappOptIn": "boolean — true se l'ospite ha accettato il gruppo WhatsApp",
  "privacyConsent": "boolean — true se ha accettato il trattamento dati personali",
  "imageRightsConsent": "boolean — true se ha accettato i diritti di immagine",
  "liabilityConsent": "boolean — true se ha accettato assunzione di rischio/liability",
  "cancellationConsent": "boolean — true se ha accettato la cancellation policy",
  "insuranceConsent": "boolean — true se ha accettato la travel/medical insurance policy",
  "assistantName": "string o null",
  "assistantEmail": "string o null",
  "assistantPhone": "string o null",
  "emergencyName": "string o null",
  "emergencyPhone": "string o null",
  "emergencyEmail": "string o null",
  "emergencyRelation": "string o null",
  "companions": [{"fullName": "string", "relationship": "string o null"}],
  "flights": [{
    "direction": "ARRIVAL o DEPARTURE",
    "departureAirport": "string o null",
    "arrivalAirport": "string o null",
    "airline": "string o null",
    "flightNumber": "string o null",
    "date": "YYYY-MM-DD o null",
    "departureTime": "string o null",
    "arrivalDay": "YYYY-MM-DD o null",
    "arrivalTime": "string o null"
  }]
}

ALTRE REGOLE:
- Date americane (MM/DD/YYYY) → converti a YYYY-MM-DD
- NON inventare dati: se un campo non è nel testo, usa null
- Array vuoto [] se non trovi nessun ospite
- Ogni ospite DEVE avere firstName e lastName (almeno uno dei due non vuoto)

DATI DA ANALIZZARE:
${rawText.substring(0, 50000)}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: '[' }  // Force JSON start
    ]
  });

  let responseText = '[' + (response.content[0]?.text || ']');

  // Clean up: remove markdown code blocks if present
  responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

  // Extract the JSON array
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  // If JSON was truncated (stop_reason = max_tokens), try to recover
  if (response.stop_reason === 'max_tokens' || response.stop_reason === 'end_turn') {
    // Try to close truncated JSON by finding the last complete object
    try { JSON.parse(jsonStr); } catch (e) {
      // Find last complete object (ends with })
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace > 0) {
        jsonStr = jsonStr.substring(0, lastBrace + 1) + ']';
      }
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    // Ensure all guests have required fields and clean data
    return parsed.map(g => ({
      firstName: g.firstName || '',
      lastName: g.lastName || '',
      fullName: `${g.firstName || ''} ${g.lastName || ''}`.trim() || null,
      email: g.email || null,
      phone: g.phone || null,
      phoneOffice: g.phoneOffice || null,
      mailingAddress: g.mailingAddress || null,
      city: g.city || null,
      state: g.state || null,
      zip: g.zip || null,
      hotelRoomsNeeded: g.hotelRoomsNeeded ? parseInt(g.hotelRoomsNeeded) : null,
      roomType: g.roomType || null,
      checkInDate: g.checkInDate || null,
      checkOutDate: g.checkOutDate || null,
      hotelUpgrade: g.hotelUpgrade || null,
      passportCountry: g.passportCountry || null,
      passportNumber: g.passportNumber || null,
      passportExpiry: g.passportExpiry || null,
      dateOfBirth: g.dateOfBirth || null,
      dietaryRestrictions: g.dietaryRestrictions || null,
      mobilityNeeds: g.mobilityNeeds || null,
      medicalInfo: g.medicalInfo || null,
      specialRequests: g.specialRequests || null,
      assistantName: g.assistantName || null,
      assistantEmail: g.assistantEmail || null,
      assistantPhone: g.assistantPhone || null,
      emergencyName: g.emergencyName || null,
      emergencyPhone: g.emergencyPhone || null,
      emergencyEmail: g.emergencyEmail || null,
      emergencyRelation: g.emergencyRelation || null,
      bio: g.bio || null,
      title: g.title || null,
      organization: g.organization || null,
      whatsappOptIn: g.whatsappOptIn === true,
      privacyConsent: g.privacyConsent === true,
      imageRightsConsent: g.imageRightsConsent === true,
      liabilityConsent: g.liabilityConsent === true,
      cancellationConsent: g.cancellationConsent === true,
      insuranceConsent: g.insuranceConsent === true,
      companions: (g.companions || []).map(c => ({
        fullName: c.fullName || 'N/A',
        relationship: c.relationship || null
      })),
      flights: (g.flights || []).map(f => ({
        direction: f.direction || 'ARRIVAL',
        departureAirport: f.departureAirport || null,
        arrivalAirport: f.arrivalAirport || null,
        airline: f.airline || null,
        flightNumber: f.flightNumber || null,
        date: f.date || null,
        departureTime: f.departureTime || null,
        arrivalDay: f.arrivalDay || null,
        arrivalTime: f.arrivalTime || null
      }))
    })).filter(g => g.firstName || g.lastName);
  } catch (e) {
    console.error('AI parse error:', e.message, responseText.substring(0, 200));
    return [];
  }
}

// ============================================================
// HELPERS
// ============================================================

function findFieldValue(obj, keywords) {
  for (const key of Object.keys(obj)) {
    for (const kw of keywords) {
      if (key.toLowerCase().includes(kw.toLowerCase())) {
        const val = obj[key];
        return val !== undefined && val !== null && val !== '' ? String(val) : null;
      }
    }
  }
  return null;
}

function findFieldValueAt(obj, keywords, occurrence) {
  let count = 0;
  for (const key of Object.keys(obj)) {
    for (const kw of keywords) {
      if (key.toLowerCase().includes(kw.toLowerCase())) {
        if (count === occurrence) {
          const val = obj[key];
          return val !== undefined && val !== null && val !== '' ? String(val) : null;
        }
        count++;
      }
    }
  }
  return null;
}

function findFieldsByPrefix(obj, prefix) {
  const result = {};
  let found = false;
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase().includes(prefix.toLowerCase())) {
      found = true;
      const val = obj[key];
      if (val) {
        const lower = key.toLowerCase();
        if (lower.includes('name') || lower.includes('full')) result.name = String(val);
        else if (lower.includes('email')) result.email = String(val);
        else if (lower.includes('phone')) result.phone = String(val);
        else if (lower.includes('relationship') || lower.includes('relation')) result.relationship = String(val);
        else if (!result.name) result.name = String(val);
      }
    }
  }
  return result;
}

function formatDateEmail(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default router;
