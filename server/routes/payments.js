import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// GET all payments with supplier info, optional filters
router.get('/', async (req, res) => {
  try {
    const { status, from, to, supplierId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (from || to) {
      where.dueDate = {};
      if (from) where.dueDate.gte = new Date(from);
      if (to) where.dueDate.lte = new Date(to);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { supplier: { select: { id: true, alias: true, businessName: true, iban: true } } },
      orderBy: { dueDate: 'asc' }
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create payment
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.paidDate) data.paidDate = new Date(data.paidDate);
    const payment = await prisma.payment.create({
      data,
      include: { supplier: { select: { id: true, alias: true, businessName: true, iban: true } } }
    });
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update payment (mark as paid, change date, etc.)
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.paidDate) data.paidDate = new Date(data.paidDate);
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data,
      include: { supplier: { select: { id: true, alias: true, businessName: true, iban: true } } }
    });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE payment
router.delete('/:id', async (req, res) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST generate WhatsApp text for selected payments
router.post('/whatsapp', async (req, res) => {
  try {
    const { paymentIds } = req.body;
    const payments = await prisma.payment.findMany({
      where: { id: { in: paymentIds } },
      include: { supplier: true }
    });

    const lines = payments.map(p => {
      const name = p.supplier.businessName || p.supplier.alias;
      const iban = p.supplier.iban || 'IBAN mancante';
      const amount = p.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const causale = p.causale || `${p.type.toLowerCase()} ${p.invoiceRef || p.supplier.service || ''}`.trim();
      return `${name}\n${iban}\n${amount}\n${causale}`;
    });

    res.json({ text: lines.join('\n\n') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
