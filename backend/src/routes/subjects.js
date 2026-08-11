const express = require('express');
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

// ─── GET /api/students/:studentId/subjects ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const subjects = await prisma.studentSubject.findMany({
      where: { studentId },
      orderBy: { subjectName: 'asc' },
    });
    res.json(subjects);
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/students/:studentId/subjects ────────────────────────────────────
// Body: [{ subjectName: string, monthlyAmount: number }]
// Full replace — deletes all existing and recreates
router.put('/', requireAdmin, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const subjects = req.body;

    if (!Array.isArray(subjects)) {
      return res.status(400).json({ error: 'Expected an array of subjects' });
    }

    const valid = subjects.filter(
      (s) => s.subjectName && s.subjectName.trim() && Number(s.monthlyAmount) >= 0
    );

    await prisma.studentSubject.deleteMany({ where: { studentId } });

    const created = [];
    for (const s of valid) {
      const sub = await prisma.studentSubject.create({
        data: {
          studentId,
          subjectName: s.subjectName.trim(),
          monthlyAmount: Number(s.monthlyAmount),
        },
      });
      created.push(sub);
    }

    res.json(created);
  } catch (err) {
    console.error('Update subjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
