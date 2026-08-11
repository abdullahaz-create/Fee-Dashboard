const express = require('express');
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');


const router = express.Router();

router.use(authenticate);

// ─── GET /api/students ────────────────────────────────────────────────────────
// Query params: class=11|12, search=string, status=active|inactive
router.get('/', async (req, res) => {
  try {
    const { class: cls, search, status } = req.query;
    const where = {};
    if (cls) where.class = String(cls);
    if (status) where.status = status;
    else where.status = 'active'; // default: only active

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { rollNumber: { contains: search.trim() } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
      include: {
        subjects: { orderBy: { subjectName: 'asc' } },
      },
    });

    res.json(students);
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/students ───────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, fatherName, class: cls, rollNumber, contact, admissionDate, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Student name is required' });
    }
    if (!cls || !['11', '12'].includes(String(cls))) {
      return res.status(400).json({ error: 'Class must be 11 or 12' });
    }

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        fatherName: fatherName?.trim() || null,
        class: String(cls),
        rollNumber: rollNumber?.trim() || null,
        contact: contact?.trim() || null,
        admissionDate: admissionDate || null,
        notes: notes?.trim() || null,
        status: 'active',
      },
      include: { subjects: true },
    });

    res.status(201).json(student);
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/students/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const student = await prisma.student.findUnique({
      where: { id },
      include: { subjects: { orderBy: { subjectName: 'asc' } } },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    console.error('Get student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/students/:id ────────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, fatherName, class: cls, rollNumber, contact, admissionDate, status, notes } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (fatherName !== undefined) updateData.fatherName = fatherName?.trim() || null;
    if (cls !== undefined) {
      if (!['11', '12'].includes(String(cls))) {
        return res.status(400).json({ error: 'Class must be 11 or 12' });
      }
      updateData.class = String(cls);
    }
    if (rollNumber !== undefined) updateData.rollNumber = rollNumber?.trim() || null;
    if (contact !== undefined) updateData.contact = contact?.trim() || null;
    if (admissionDate !== undefined) updateData.admissionDate = admissionDate || null;
    if (status !== undefined && ['active', 'inactive'].includes(status)) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: { subjects: { orderBy: { subjectName: 'asc' } } },
    });

    res.json(student);
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/students/:id (soft delete — deactivate) ─────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.student.update({
      where: { id },
      data: { status: 'inactive' },
    });
    res.json({ message: 'Student deactivated successfully' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
