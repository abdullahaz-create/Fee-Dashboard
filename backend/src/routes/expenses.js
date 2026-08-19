const express = require('express');
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ─── GET /api/expenses?month=&year= ──────────────────────────────────────────
// Returns all expenses for the given month and year (any authenticated user)
router.get('/', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year  = parseInt(req.query.year,  10);

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month. Must be 1–12.' });
    }
    if (isNaN(year) || year < 2000) {
      return res.status(400).json({ error: 'Invalid year.' });
    }

    const expenses = await prisma.expense.findMany({
      where: { month, year },
      orderBy: { createdAt: 'asc' },
    });

    res.json(expenses);
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── POST /api/expenses ───────────────────────────────────────────────────────
// Create a new expense for a specific month/year (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, month, year, amount } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Expense name is required.' });
    }
    const m = parseInt(month, 10);
    const y = parseInt(year,  10);
    const a = parseFloat(amount);

    if (isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: 'Invalid month. Must be 1–12.' });
    }
    if (isNaN(y) || y < 2000) {
      return res.status(400).json({ error: 'Invalid year.' });
    }
    if (isNaN(a) || a < 0) {
      return res.status(400).json({ error: 'Amount must be a non-negative number.' });
    }

    const expense = await prisma.expense.create({
      data: {
        name: String(name).trim(),
        month: m,
        year:  y,
        amount: a,
      },
    });

    res.status(201).json(expense);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An expense with this name already exists for the selected month.' });
    }
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── PUT /api/expenses/:id ────────────────────────────────────────────────────
// Update an expense's name and/or amount (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid expense ID.' });

    const { name, amount } = req.body;
    const updateData = {};

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Expense name cannot be empty.' });
      updateData.name = String(name).trim();
    }
    if (amount !== undefined) {
      const a = parseFloat(amount);
      if (isNaN(a) || a < 0) return res.status(400).json({ error: 'Amount must be a non-negative number.' });
      updateData.amount = a;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    });

    res.json(expense);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Expense not found.' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An expense with this name already exists for the selected month.' });
    }
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── DELETE /api/expenses/:id ─────────────────────────────────────────────────
// Delete an expense (admin only) — does NOT affect other months
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid expense ID.' });

    await prisma.expense.delete({ where: { id } });
    res.json({ message: 'Expense removed successfully.' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Expense not found.' });
    }
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;
