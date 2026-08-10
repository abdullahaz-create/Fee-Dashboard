const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// ─── GET /api/classes/:class/ledger ─────────────────────────────────────────
// Query: month=8&year=2026
// Returns all active students in class with their configured subjects & monthly fee record for requested month
router.get('/:class/ledger', async (req, res) => {
  try {
    const cls = req.params.class;
    const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year, 10)  : new Date().getFullYear();

    const students = await prisma.student.findMany({
      where: { class: String(cls), status: 'active' },
      orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
      include: {
        subjects: { orderBy: { subjectName: 'asc' } },
        feeRecords: {
          where: { month, year },
          include: {
            subjectBreakdown: { orderBy: { subjectName: 'asc' } },
            payments: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    res.json(students);
  } catch (err) {
    console.error('Class ledger error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/classes/:class/summary (kept for backwards compatibility) ────
router.get('/:class/summary', async (req, res) => {
  try {
    const cls = req.params.class;
    const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year, 10)  : new Date().getFullYear();

    const students = await prisma.student.findMany({
      where: { class: String(cls), status: 'active' },
      include: {
        feeRecords: {
          where: { month, year },
        },
      },
    });

    const totalStudents = students.length;
    let paid = 0, partial = 0, unpaid = 0, noRecord = 0;
    let totalExpected = 0, totalCollected = 0, totalRemaining = 0;

    for (const student of students) {
      const record = student.feeRecords[0];
      if (!record) {
        noRecord++;
      } else {
        totalExpected  += record.totalFee;
        totalCollected += record.amountPaid;
        totalRemaining += record.remainingAmount;
        if (record.status === 'PAID')         paid++;
        else if (record.status === 'PARTIAL') partial++;
        else                                  unpaid++;
      }
    }

    res.json({
      class: cls, month, year,
      totalStudents, paid, partial, unpaid, noRecord,
      totalExpected, totalCollected, totalRemaining,
    });
  } catch (err) {
    console.error('Class summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
