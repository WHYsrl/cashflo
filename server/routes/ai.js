import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(__dirname, '../../uploads/temp'), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

const MODELS = {
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6'
};

const EXTRACTION_PROMPT = `Sei un assistente specializzato nell'estrazione dati da fatture e preventivi italiani.
Analizza il documento fornito e restituisci un JSON con questa struttura:

{
  "supplierAlias": "nome breve del fornitore (es. HASSLER, PALOMBINI)",
  "businessName": "ragione sociale completa (es. HASSLER ROMA SPA)",
  "vatNumber": "partita IVA",
  "iban": "IBAN se presente",
  "email": "email se presente",
  "phone": "telefono fisso se presente",
  "mobile": "cellulare se presente",
  "contactPerson": "nome del referente o persona di contatto se presente",
  "serviceSummary": "sintesi breve del servizio, formato compatto tipo DINNER 19.06, LUNCH 18.06, LOCATION 17.06",
  "serviceDescription": "descrizione estesa e dettagliata del servizio fornito (menu, allestimento, location, etc.)",
  "invoiceNumber": "numero fattura o preventivo",
  "documentType": "FATTURA | PREVENTIVO | CONTRATTO | RICEVUTA",
  "costs": {
    "amountNet": numero netto,
    "vatRate": aliquota IVA come numero (es. 22),
    "vatAmount": importo IVA,
    "totalGross": totale ivato
  },
  "payments": [
    {
      "type": "ACCONTO | SALDO",
      "label": "etichetta tranche (es. Primo deposito, Secondo deposito, Saldo finale)",
      "amount": importo,
      "dueDate": "YYYY-MM-DD se specificato",
      "description": "descrizione del pagamento"
    }
  ],
  "notes": "altre informazioni rilevanti (condizioni di cancellazione, extra, etc.)"
}

REGOLE IMPORTANTI PER I CALCOLI:
- Se il documento indica un prezzo unitario (es. €95/persona) e un numero di ospiti/unità (es. 30 o 35), CALCOLA il totale moltiplicando. Se c'è un range (es. 30-35), usa il numero massimo.
- Se ci sono voci separate (es. staff, attrezzature, servizi extra), SOMMA tutto per ottenere il totale complessivo.
- Calcola sempre amountNet come somma di tutte le voci. Se l'IVA è indicata (es. 10%, 22%), calcola vatAmount e totalGross.
- Se il documento indica pagamenti in percentuale (es. "50% alla conferma"), CALCOLA l'importo effettivo basandoti sul totale calcolato.
- I payments devono SEMPRE avere un amount numerico calcolato, mai null.

Se un campo non è presente nel documento e non è calcolabile, usa null. Cerca di estrarre TUTTI i dettagli di pagamento: acconti, depositi, tranches, saldi, con relative scadenze. Rispondi SOLO con il JSON, senza commenti.`;

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
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || req.file.originalname.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: fileBuf });
        const docText = result.value;
        if (!docText || docText.trim().length === 0) {
          fs.unlinkSync(req.file.path);
          return res.status(422).json({ error: 'Impossibile estrarre testo dal file DOCX. Prova a convertirlo in PDF.' });
        }
        content = [{ type: 'text', text: `${EXTRACTION_PROMPT}\n\nContenuto documento DOCX:\n${docText}` }];
      } else {
        const text = fileBuf.toString('utf-8');
        content = [{ type: 'text', text: `${EXTRACTION_PROMPT}\n\nContenuto documento:\n${text}` }];
      }
      // Cleanup temp file
      fs.unlinkSync(req.file.path);
    } else {
      return res.status(400).json({ error: 'Nessun file fornito' });
    }

    const selectedModel = MODELS[req.body?.model] || MODELS.sonnet;
    const response = await client.messages.create({
      model: selectedModel,
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
    const { text, model } = req.body;
    if (!text) return res.status(400).json({ error: 'Nessun testo fornito' });

    const selectedModel = MODELS[model] || MODELS.sonnet;
    const response = await client.messages.create({
      model: selectedModel,
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
