import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// GET all suppliers with costs and payment summary
router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        costs: true,
        payments: true,
        extraCosts: true,
        documents: { select: { id: true, type: true, fileName: true } }
      },
      orderBy: { alias: 'asc' }
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single supplier
router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { costs: true, payments: { orderBy: { dueDate: 'asc' } }, extraCosts: true, documents: true }
    });
    if (!supplier) return res.status(404).json({ error: 'Fornitore non trovato' });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create supplier
router.post('/', async (req, res) => {
  try {
    const { alias, businessName, iban, vatNumber, email, phone, mobile, contactPerson, serviceSummary, serviceDescription, notes, costs, payments } = req.body;
    const supplier = await prisma.supplier.create({
      data: {
        alias, businessName, iban, vatNumber, email, phone, mobile, contactPerson, serviceSummary, serviceDescription,
        notes,
        costs: costs ? { create: costs } : undefined,
        payments: payments ? {
          create: payments.map(p => ({
            ...p,
            dueDate: p.dueDate ? new Date(p.dueDate) : null,
            paidDate: p.paidDate ? new Date(p.paidDate) : null
          }))
        } : undefined
      },
      include: { costs: true, payments: true }
    });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update supplier
router.put('/:id', async (req, res) => {
  try {
    const { alias, businessName, iban, vatNumber, email, phone, mobile, contactPerson, serviceSummary, serviceDescription, notes } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        alias, businessName, iban, vatNumber, email, phone, mobile, contactPerson, serviceSummary, serviceDescription, notes
      },
      include: { costs: true, payments: true, extraCosts: true, documents: true }
    });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supplier
router.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add cost to supplier
router.post('/:id/costs', async (req, res) => {
  try {
    const cost = await prisma.cost.create({
      data: { supplierId: req.params.id, ...req.body }
    });
    res.status(201).json(cost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE cost
router.delete('/:supplierId/costs/:costId', async (req, res) => {
  try {
    await prisma.cost.delete({ where: { id: req.params.costId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Extra Costs ---

// POST add extra cost to supplier
router.post('/:id/extra-costs', async (req, res) => {
  try {
    const extra = await prisma.extraCost.create({
      data: { supplierId: req.params.id, ...req.body }
    });
    res.status(201).json(extra);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update extra cost
router.put('/:supplierId/extra-costs/:extraId', async (req, res) => {
  try {
    const extra = await prisma.extraCost.update({
      where: { id: req.params.extraId },
      data: req.body
    });
    res.json(extra);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE extra cost
router.delete('/:supplierId/extra-costs/:extraId', async (req, res) => {
  try {
    await prisma.extraCost.delete({ where: { id: req.params.extraId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
