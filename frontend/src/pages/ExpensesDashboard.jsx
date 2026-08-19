import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../api/axios';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtAmount = (n) =>
  n !== undefined && n !== null
    ? Number(n).toLocaleString('en-PK')
    : '0';

export default function ExpensesDashboard() {
  const { addToast } = useToast();
  const { isAdmin }  = useAuth();
  const navigate     = useNavigate();
  const now          = new Date();

  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // ── Add / Edit Modal ────────────────────────────────────────────────────────
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null); // null = add, obj = edit
  const [formName,    setFormName]    = useState('');
  const [formAmount,  setFormAmount]  = useState('');
  const [formError,   setFormError]   = useState('');
  const [saving,      setSaving]      = useState(false);

  // ── Remove Confirm ──────────────────────────────────────────────────────────
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing,     setRemoving]     = useState(false);

  // ── Fetch expenses for the selected month/year ──────────────────────────────
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses', {
        params: { month: selMonth, year: selYear },
      });
      setExpenses(res.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [selMonth, selYear]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ── Total for current month ─────────────────────────────────────────────────
  const monthTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // ── Open Add Modal ──────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditTarget(null);
    setFormName('');
    setFormAmount('');
    setFormError('');
    setModalOpen(true);
  };

  // ── Open Edit Modal ─────────────────────────────────────────────────────────
  const openEditModal = (expense) => {
    setEditTarget(expense);
    setFormName(expense.name);
    setFormAmount(String(expense.amount));
    setFormError('');
    setModalOpen(true);
  };

  // ── Save (Add or Edit) ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setFormError('');
    if (!formName.trim()) { setFormError('Expense name is required.'); return; }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt < 0) { setFormError('Please enter a valid amount (0 or more).'); return; }

    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/expenses/${editTarget.id}`, {
          name:   formName.trim(),
          amount: amt,
        });
        addToast('Expense updated ✓');
      } else {
        await api.post('/expenses', {
          name:   formName.trim(),
          month:  selMonth,
          year:   selYear,
          amount: amt,
        });
        addToast('Expense added ✓');
      }
      setModalOpen(false);
      fetchExpenses();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  // ── Remove ──────────────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.delete(`/expenses/${removeTarget.id}`);
      addToast('Expense removed ✓');
      setRemoveTarget(null);
      fetchExpenses();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to remove expense.', 'error');
    } finally {
      setRemoving(false);
    }
  };

  const years = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 3; y--) years.push(y);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <button className="back-link" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            <h1 className="page-title">Expenses</h1>
            <p className="page-subtitle">Track and manage academy expenses by month</p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Month / Year Selector */}
            <div className="ledger-date-picker">
              <span className="ledger-date-label">Month:</span>
              <select
                id="expense-select-month"
                className="form-select"
                value={selMonth}
                onChange={e => setSelMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select
                id="expense-select-year"
                className="form-select"
                value={selYear}
                onChange={e => setSelYear(Number(e.target.value))}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Add Expense — Admin only */}
            {isAdmin && (
              <button
                id="add-expense-btn"
                className="btn btn-primary"
                onClick={openAddModal}
              >
                + Add Expense
              </button>
            )}
          </div>
        </div>

        {/* ── Expense Table Card ─────────────────────────────────────────── */}
        <div className="card ledger-card">
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <div className="ledger-header-title">
              {MONTHS[selMonth - 1]} {selYear} Expenses
              <span className="ledger-student-count">({expenses.length} item{expenses.length !== 1 ? 's' : ''})</span>
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"></div>
              <div className="empty-state-title">No expenses for {MONTHS[selMonth - 1]} {selYear}</div>
              <div className="empty-state-text">
                {isAdmin
                  ? 'Click "+ Add Expense" to record an expense for this month.'
                  : 'No expenses have been recorded for this month yet.'}
              </div>
              {isAdmin && (
                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={openAddModal}>
                  + Add Expense
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="table ledger-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: 280 }}>Expense Name</th>
                    <th style={{ textAlign: 'right', minWidth: 140 }}>Amount (Rs.)</th>
                    {isAdmin && <th style={{ textAlign: 'right', minWidth: 140 }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(expense => (
                    <tr key={expense.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {expense.name}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                        Rs. {fmtAmount(expense.amount)}
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="fee-action-group" style={{ justifyContent: 'flex-end' }}>
                            <button
                              id={`edit-expense-${expense.id}`}
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(expense)}
                            >
                              Edit
                            </button>
                            <button
                              id={`remove-expense-${expense.id}`}
                              className="btn btn-danger btn-sm"
                              onClick={() => setRemoveTarget(expense)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {/* Total row */}
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)', padding: '12px 16px' }}>
                      Total — {MONTHS[selMonth - 1]} {selYear}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)', padding: '12px 16px' }}>
                      Rs. {fmtAmount(monthTotal)}
                    </td>
                    {isAdmin && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Add / Edit Expense Modal ───────────────────────────────────── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editTarget
            ? `Edit Expense — ${MONTHS[selMonth - 1]} ${selYear}`
            : `Add Expense — ${MONTHS[selMonth - 1]} ${selYear}`}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button id="save-expense-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editTarget ? 'Update Expense' : 'Save Expense'}
              </button>
            </>
          }
        >
          {formError && (
            <div className="login-error" style={{ marginBottom: 16 }}>
              {formError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Expense Name *</label>
            <input
              id="expense-name-input"
              className="form-input"
              placeholder="e.g. Electricity, Internet, Stationery"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (Rs.) *</label>
            <input
              id="expense-amount-input"
              className="form-input"
              type="number"
              placeholder="e.g. 20000"
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              min="0"
            />
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            This expense will be saved for <strong>{MONTHS[selMonth - 1]} {selYear}</strong> only.
          </div>
        </Modal>

        {/* ── Remove Confirm Dialog ──────────────────────────────────────── */}
        <ConfirmDialog
          isOpen={!!removeTarget}
          onClose={() => setRemoveTarget(null)}
          onConfirm={handleRemove}
          loading={removing}
          title={`Remove "${removeTarget?.name}"?`}
          message={`This will permanently remove the ${MONTHS[selMonth - 1]} ${selYear} record for "${removeTarget?.name}". Other months are not affected.`}
          confirmLabel="Remove"
        />
      </main>
    </div>
  );
}
