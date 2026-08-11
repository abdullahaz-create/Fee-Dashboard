const express = require('express');
const prisma = require('../prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

// ─── POST /api/fees/:feeRecordId/payments ─────────────────────────────────────
// Adds a payment to an existing monthly fee record.
// Supports multiple payments per record (partial → full payment).
router.post('/:feeRecordId/payments', requireAdmin, async (req, res) => {
  try {
    const feeRecordId = parseInt(req.params.feeRecordId, 10);
    const { amountPaid, paymentDate, notes } = req.body;

    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }

    const record = await prisma.monthlyFeeRecord.findUnique({
      where: { id: feeRecordId },
    });

    if (!record) return res.status(404).json({ error: 'Fee record not found' });
    if (record.remainingAmount <= 0) {
      return res.status(400).json({ error: 'This fee record is already fully paid' });
    }

    // Create the payment entry
    const payment = await prisma.payment.create({
      data: {
        feeRecordId,
        amountPaid: amount,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        notes: notes?.trim() || null,
      },
    });

    // Recalculate totals from all payments
    const allPayments = await prisma.payment.findMany({ where: { feeRecordId } });
    const newAmountPaid = allPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const newRemaining = Math.max(0, record.totalFee - newAmountPaid);
    const newStatus = newRemaining <= 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : 'UNPAID';

    const updated = await prisma.monthlyFeeRecord.update({
      where: { id: feeRecordId },
      data: {
        amountPaid: newAmountPaid,
        remainingAmount: newRemaining,
        status: newStatus,
      },
      include: {
        subjectBreakdown: { orderBy: { subjectName: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.status(201).json({ payment, feeRecord: updated });
  } catch (err) {
    console.error('Add payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
