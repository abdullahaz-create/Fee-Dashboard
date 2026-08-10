const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate);

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── GET /api/students/:studentId/fees ───────────────────────────────────────
// Query: year=2026 (optional — returns all if omitted)
router.get('/', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const where = { studentId };
    if (req.query.year) where.year = parseInt(req.query.year, 10);

    const records = await prisma.monthlyFeeRecord.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        subjectBreakdown: { orderBy: { subjectName: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.json(records.map((r) => ({ ...r, monthName: MONTH_NAMES[r.month] })));
  } catch (err) {
    console.error('Get fees error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/students/:studentId/fees ──────────────────────────────────────
// Body: { month, year, subjectBreakdown: [{subjectName, amount}], notes }
router.post('/', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const { month, year, subjectBreakdown, notes } = req.body;

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (!m || m < 1 || m > 12) {
      return res.status(400).json({ error: 'Valid month (1-12) is required' });
    }
    if (!y || y < 2000 || y > 2100) {
      return res.status(400).json({ error: 'Valid year is required' });
    }
    if (!Array.isArray(subjectBreakdown) || subjectBreakdown.length === 0) {
      return res.status(400).json({ error: 'Subject breakdown is required' });
    }

    // Check if a record already exists for this month/year
    const existing = await prisma.monthlyFeeRecord.findUnique({
      where: { studentId_month_year: { studentId, month: m, year: y } },
    });
    if (existing) {
      return res.status(409).json({
        error: `A fee record already exists for ${MONTH_NAMES[m]} ${y}. Use "Add Payment" to record a payment.`,
      });
    }

    const totalFee = subjectBreakdown.reduce((sum, s) => sum + Number(s.amount), 0);
    if (totalFee <= 0) {
      return res.status(400).json({ error: 'Total fee must be greater than zero' });
    }

    const record = await prisma.monthlyFeeRecord.create({
      data: {
        studentId,
        month: m,
        year: y,
        totalFee,
        amountPaid: 0,
        remainingAmount: totalFee,
        status: 'UNPAID',
        notes: notes?.trim() || null,
        subjectBreakdown: {
          create: subjectBreakdown.map((s) => ({
            subjectName: s.subjectName.trim(),
            amount: Number(s.amount),
          })),
        },
      },
      include: {
        subjectBreakdown: { orderBy: { subjectName: 'asc' } },
        payments: true,
      },
    });

    res.status(201).json({ ...record, monthName: MONTH_NAMES[record.month] });
  } catch (err) {
    console.error('Create fee record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/students/:studentId/fees/:feeRecordId ──────────────────────────
router.get('/:feeRecordId', async (req, res) => {
  try {
    const feeRecordId = parseInt(req.params.feeRecordId, 10);
    const studentId = parseInt(req.params.studentId, 10);

    const record = await prisma.monthlyFeeRecord.findFirst({
      where: { id: feeRecordId, studentId },
      include: {
        subjectBreakdown: { orderBy: { subjectName: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' } },
        student: true,
      },
    });

    if (!record) return res.status(404).json({ error: 'Fee record not found' });
    res.json({ ...record, monthName: MONTH_NAMES[record.month] });
  } catch (err) {
    console.error('Get fee record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
