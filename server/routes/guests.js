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
      // Dynamic import for xlsx
      const XLSX = (await import('xlsx')).default;
      const workbook = XLSX.readFile(filePath);

      // Try to find hotel manifest sheet
      const hotelSheet = workbook.SheetNames.find(n => n.toLowerCase().includes('hotel')) || workbook.SheetNames[0];
      const hotelData = XLSX.utils.sheet_to_json(workbook.Sheets[hotelSheet]);

      // Try to find survey sheet
      const surveySheet = workbook.SheetNames.find(n => n.toLowerCase().includes('survey'));
      let surveyData = [];
      if (surveySheet) {
        const rawSurvey = XLSX.utils.sheet_to_json(workbook.Sheets[surveySheet], { header: 1 });
        if (rawSurvey.length > 1) {
          const headers = rawSurvey[0];
          surveyData = rawSurvey.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => { if (h && row[i] !== undefined) obj[String(h).trim()] = row[i]; });
            return obj;
          });
        }
      }

      // Parse hotel manifest
      for (const row of hotelData) {
        const fullName = row['Full Name'] || row['full name'] || '';
        const lastName = row['Last Name'] || row['last name'] || '';
        if (!fullName && !lastName) continue;

        // Parse name - handle "X and Y LastName" pattern
        let firstName = '', companionName = '';
        const andMatch = fullName.match(/^(.+?)\s+and\s+(.+)$/i);
        if (andMatch) {
          // Two people: "Roberta and Stanley Bogen"
          const parts = andMatch[2].trim().split(/\s+/);
          if (parts.length > 1) {
            // "Stanley Bogen" -> companion is first part of original
            firstName = parts.slice(0, -1).join(' ');
            companionName = andMatch[1].trim();
          } else {
            firstName = andMatch[2].trim();
            companionName = andMatch[1].trim();
          }
        } else {
          firstName = fullName.replace(lastName, '').trim().replace(/,\s*$/, '');
        }

        const guest = {
          firstName: firstName || fullName,
          lastName,
          fullName,
          hotelRoomsNeeded: row['HOTEL ROOMS NEEDED'] ? parseInt(row['HOTEL ROOMS NEEDED']) : null,
          roomType: row['ROOM TYPE'] || null,
          checkInDate: row['HOTEL CHECK-IN DATE'] || null,
          checkOutDate: row['HOTEL OUT DATE'] || null,
          specialRequests: row['Unnamed: 7'] || null,
          companions: [],
          flights: []
        };

        if (companionName) {
          guest.companions.push({ fullName: companionName + ' ' + lastName, relationship: 'Spouse/Partner' });
        }

        // Count field
        const count = parseInt(row['COUNT']);
        if (count > 1 && !companionName) {
          guest.companions.push({ fullName: 'Accompagnatore', relationship: 'TBD' });
        }

        // Try to match with survey data
        const surveyMatch = surveyData.find(s => {
          const sLast = s[''] || s['Last Name'] || '';
          const sFirst = s['First Name'] || Object.values(s)[0] || '';
          return sLast.toLowerCase().includes(lastName.toLowerCase()) ||
                 sFirst.toLowerCase().includes(firstName.toLowerCase());
        });

        if (surveyMatch) {
          // Map survey fields
          const vals = Object.values(surveyMatch);
          const keys = Object.keys(surveyMatch);

          // Contact info - first fields are usually First, Last, Phone, Phone2, Email, Address...
          guest.email = findFieldValue(surveyMatch, ['Preferred Email', 'Email']);
          guest.phone = findFieldValue(surveyMatch, ['Mobile Phone', 'Phone Number']);
          guest.phoneOffice = findFieldValue(surveyMatch, ['Home or Office']);
          guest.city = findFieldValue(surveyMatch, ['City']);
          guest.state = findFieldValue(surveyMatch, ['State']);
          guest.zip = findFieldValue(surveyMatch, ['Zip']);

          // Companion from survey
          const companionField = findFieldValue(surveyMatch, ['full name and relationship', '+1']);
          if (companionField && guest.companions.length === 0) {
            guest.companions.push({ fullName: companionField, relationship: 'Companion' });
          }

          // Passport
          guest.passportCountry = findFieldValue(surveyMatch, ['Passport Country']);
          guest.passportNumber = findFieldValue(surveyMatch, ['Passport Number']);
          guest.passportExpiry = findFieldValue(surveyMatch, ['Passport Expiration']);
          guest.dateOfBirth = findFieldValue(surveyMatch, ['Date of Birth']);

          // Dietary & Medical
          guest.dietaryRestrictions = findFieldValue(surveyMatch, ['Dietary']);
          guest.mobilityNeeds = findFieldValue(surveyMatch, ['mobility']);
          guest.medicalInfo = findFieldValue(surveyMatch, ['medical information', 'medications']);

          // Assistant
          const assistFields = findFieldsByPrefix(surveyMatch, 'assistant');
          if (assistFields.name) {
            guest.assistantName = assistFields.name;
            guest.assistantEmail = assistFields.email;
            guest.assistantPhone = assistFields.phone;
          }

          // Emergency contact
          const emergFields = findFieldsByPrefix(surveyMatch, 'emergency');
          if (emergFields.name) {
            guest.emergencyName = emergFields.name;
            guest.emergencyPhone = emergFields.phone;
            guest.emergencyEmail = emergFields.email;
            guest.emergencyRelation = emergFields.relationship;
          }

          // Flights - Arrival
          const depAirport = findFieldValue(surveyMatch, ['Departure Airport']);
          const arrAirport = findFieldValue(surveyMatch, ['Arrival Airport']);
          const airline = findFieldValue(surveyMatch, ['Airline']);
          const flightNum = findFieldValue(surveyMatch, ['Flight Number']);
          const flightDate = findFieldValue(surveyMatch, ['Date']);
          const depTime = findFieldValue(surveyMatch, ['DEPARTURE Time', 'Time']);
          const arrDay = findFieldValue(surveyMatch, ['ARRIVAL DAY']);
          const arrTime = findFieldValue(surveyMatch, ['ARRIVAL TIME']);

          if (depAirport || flightNum) {
            guest.flights.push({
              direction: 'ARRIVAL',
              departureAirport: depAirport,
              arrivalAirport: arrAirport,
              airline: airline,
              flightNumber: flightNum,
              date: flightDate,
              departureTime: depTime,
              arrivalDay: arrDay,
              arrivalTime: arrTime
            });
          }

          // Flights - Departure
          const depAirport2 = findFieldValueAt(surveyMatch, ['Departure Airport'], 1);
          const airline2 = findFieldValueAt(surveyMatch, ['Airline'], 1);
          const flightNum2 = findFieldValueAt(surveyMatch, ['Flight Number'], 1);
          const flightDate2 = findFieldValueAt(surveyMatch, ['Date'], 1);
          const depTime2 = findFieldValueAt(surveyMatch, ['Time'], 1);

          if (depAirport2 || flightNum2) {
            guest.flights.push({
              direction: 'DEPARTURE',
              departureAirport: depAirport2,
              airline: airline2,
              flightNumber: flightNum2,
              date: flightDate2,
              departureTime: depTime2
            });
          }

          // Hotel upgrade
          guest.hotelUpgrade = findFieldValue(surveyMatch, ['upgrade', 'Deluxe Room', 'Suite']);

          // WhatsApp
          const waVal = findFieldValue(surveyMatch, ['WhatsApp']);
          guest.whatsappOptIn = waVal ? waVal.toLowerCase().includes('yes') : false;

          // Special requests from survey
          const surveyRequests = findFieldValue(surveyMatch, ['Comments', 'special requests']);
          if (surveyRequests) {
            guest.specialRequests = [guest.specialRequests, surveyRequests].filter(Boolean).join(' | ');
          }
        }

        parsedGuests.push(guest);
      }
    } else if (ext === '.pdf') {
      // For PDF, use AI to extract (placeholder - returns raw text for now)
      const mammoth = await import('mammoth').catch(() => null);
      // Read as text using pdf-parse
      const pdfParse = (await import('pdf-parse')).default;
      const buf = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buf);
      // Return the text for manual processing
      parsedGuests = [{ _rawText: pdfData.text, _type: 'pdf' }];
    }

    // Clean up
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

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
      const { companions, flights, _rawText, _type, ...guestData } = g;

      // Clean dates
      if (guestData.checkInDate) guestData.checkInDate = new Date(guestData.checkInDate);
      else guestData.checkInDate = null;
      if (guestData.checkOutDate) guestData.checkOutDate = new Date(guestData.checkOutDate);
      else guestData.checkOutDate = null;

      const created = await prisma.guest.create({
        data: {
          ...guestData,
          hotelRoomsNeeded: guestData.hotelRoomsNeeded ? parseInt(guestData.hotelRoomsNeeded) : null,
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
