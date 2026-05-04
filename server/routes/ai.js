import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(__dirname, '../../uploads/temp'), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

const EXTRACTION_PROMPT = `Sei un assistente specializzato nell'estrazione dati da fatture e preventivi italiani.
Analizza il documento fornito e restituisci un JSON con questa struttura:

{
  "supplierAlias": "nome breve del fornitore",
  "businessName": "ragione sociale completa",
  "vatNumber": "partita IVA",
  "iban": "IBAN se presente",
  "service": "descrizione del servizio",
  "invoiceNumber": "numero fattura o preventivo",
  "documentType": "FATTURA | PREVENTIVO | CONTRATTO | RICEVUTA",
  "eventDate": "data evento in formato YYYY-MM-DD se presente",
  "costs": {
    "amountNet": numero netto,
    "vatRate": aliquota IVA come numero (es. 22),
    "vatAmount": importo IVA,
    "totalGross": totale ivato
  },
  "payments": [
    {
      "type": "ACCONTO | SALDO",
      "amount": importo,
      "dueDate": "YYYY-MM-DD se specificato",
      "description": "descrizione del pagamento"
    }
  ],
  "notes": "altre informazioni rilevanti"
}

Se un campo non è presente nel documento, usa null. Cerca di estrarre tutti i dettagli di pagamento (acconti, saldi, scadenze). Rispondi SOLO con il JSON, senza commenti.`;

// POST parse document with AI (file upload)
router.post('/parse-document', upload.single('file'), async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata' });

    const client = new Anthropic({ apiKey });
    let content = [];

    if (req.file) {
      const fileBuf = fs.readFileSync(req.file.path);
      const base64 = fileBuf.toString('base64');
      const mime = req.file.mimetype;

      if (mime.startsWith('image/')) {
        content = [
          { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT }
        ];
      } else if (mime === 'application/pdf') {
        content = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT }
        ];
      } else {
        const text = fileBuf.toString('utf-8');
        content = [{ type: 'text', text: `${EXTRACTION_PROMPT}\n\nContenuto documento:\n${text}` }];
      }
      // Cleanup temp file
      fs.unlinkSync(req.file.path);
    } else {
      return res.status(400).json({ error: 'Nessun file fornito' });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content }]
    });

    const responseText = response.content[0]?.text || '';
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Impossibile estrarre dati', raw: responseText });

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ parsed, raw: responseText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST parse free text with AI
router.post('/parse-text', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata' });

    const client = new Anthropic({ apiKey });
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Nessun testo fornito' });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\nTesto:\n${text}` }]
    });

    const responseText = response.content[0]?.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Impossibile estrarre dati', raw: responseText });

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ parsed, raw: responseText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
