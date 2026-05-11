import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// GET dashboard summary
router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.count();
    const payments = await prisma.payment.findMany({
      include: { supplier: { select: { alias: true, businessName: true } } }
    });

    const totalDue = payments.filter(p => p.status !== 'PAID').reduce((s, p) => s + p.amount, 0);
    const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
    const overdue = payments.filter(p => p.status !== 'PAID' && p.dueDate && new Date(p.dueDate) < new Date());
    const upcoming = payments.filter(p => p.status !== 'PAID' && p.dueDate && new Date(p.dueDate) >= new Date())
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 10);

    // Mark overdue in DB
    for (const p of overdue) {
      if (p.status === 'PENDING') {
        await prisma.payment.update({ where: { id: p.id }, data: { status: 'OVERDUE' } });
      }
    }

    const costs = await prisma.cost.findMany();
    const totalCosts = costs.reduce((s, c) => s + (c.totalGross || c.amountNet || 0), 0);

    // Extra costs: only confirmed ones count
    const extraCosts = await prisma.extraCost.findMany({ where: { status: 'CONFERMATA' } });
    const totalExtraCosts = extraCosts.reduce((s, e) => s + e.amount, 0);

    res.json({
      suppliersCount: suppliers,
      totalCosts: totalCosts + totalExtraCosts,
      totalPaid,
      totalDue,
      totalExtraCosts,
      overdueCount: overdue.length,
      overduePayments: overdue,
      upcomingPayments: upcoming
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
