import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import prisma from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();

// GET all documents
router.get('/', async (req, res) => {
  try {
    const docs = await prisma.document.findMany({
      include: { supplier: { select: { id: true, alias: true, businessName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload document
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });
    const { supplierId, type, number } = req.body;
    const doc = await prisma.document.create({
      data: {
        supplierId: supplierId || null,
        type: type || 'ALTRO',
        number: number || null,
        fileName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype
      }
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update document (link to supplier, update parsed data)
router.put('/:id', async (req, res) => {
  try {
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: req.body,
      include: { supplier: { select: { id: true, alias: true, businessName: true } } }
    });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE document
router.delete('/:id', async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (doc?.filePath && fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
