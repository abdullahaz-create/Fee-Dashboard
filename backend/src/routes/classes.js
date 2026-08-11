const express = require('express');
const prisma = require('../prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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

// ─── GET /api/classes/:class/subject-summary ────────────────────────────────
// Query: month=8&year=2026 (both optional — omit for all-time totals)
// Returns subject-wise totals: totalOwed (from all records) and
// totalCollected (only from PAID records) for the given class.
router.get('/:class/subject-summary', async (req, res) => {
  try {
    const cls   = req.params.class;
    const month = req.query.month ? parseInt(req.query.month, 10) : null;
    const year  = req.query.year  ? parseInt(req.query.year,  10) : null;

    // Build fee record filter
    const feeRecordWhere = {};
    if (month) feeRecordWhere.month = month;
    if (year)  feeRecordWhere.year  = year;

    // Fetch all active students in this class with their fee records and configured subjects
    const students = await prisma.student.findMany({
      where: { class: String(cls), status: 'active' },
      include: {
        subjects: { orderBy: { subjectName: 'asc' } },
        feeRecords: {
          where: Object.keys(feeRecordWhere).length > 0 ? feeRecordWhere : undefined,
          include: {
            subjectBreakdown: true,
          },
        },
      },
    });

    // Aggregate per-subject
    const subjectMap = {}; // subjectName -> { totalOwed, totalCollected, paidCount, partialCount, unpaidCount }

    for (const student of students) {
      for (const record of student.feeRecords) {
        for (const sb of record.subjectBreakdown) {
          if (!subjectMap[sb.subjectName]) {
            subjectMap[sb.subjectName] = {
              subjectName:    sb.subjectName,
              totalOwed:      0,
              totalCollected: 0,
              paidCount:      0,
              partialCount:   0,
              unpaidCount:    0,
            };
          }
          subjectMap[sb.subjectName].totalOwed += sb.amount;

          if (record.status === 'PAID') {
            subjectMap[sb.subjectName].totalCollected += sb.amount;
            subjectMap[sb.subjectName].paidCount      += 1;
          } else if (record.status === 'PARTIAL') {
            subjectMap[sb.subjectName].partialCount   += 1;
          } else {
            subjectMap[sb.subjectName].unpaidCount    += 1;
          }
        }
      }
    }

    // Also include students who have subjects configured but no fee record yet
    for (const student of students) {
      for (const sub of student.subjects || []) {
        if (!subjectMap[sub.subjectName]) {
          subjectMap[sub.subjectName] = {
            subjectName:    sub.subjectName,
            totalOwed:      0,
            totalCollected: 0,
            paidCount:      0,
            partialCount:   0,
            unpaidCount:    0,
          };
        }
      }
    }

    const result = Object.values(subjectMap).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName)
    );

    // Class-level summary
    const summary = {
      totalStudents:    students.length,
      totalOwed:        result.reduce((s, x) => s + x.totalOwed,      0),
      totalCollected:   result.reduce((s, x) => s + x.totalCollected,  0),
    };

    res.json({ class: cls, month, year, summary, subjects: result });
  } catch (err) {
    console.error('Subject summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

