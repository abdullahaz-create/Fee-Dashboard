import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../api/axios';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;

export default function StudentDetail() {
  const { id }       = useParams();
  const { addToast } = useToast();
  const navigate     = useNavigate();
  const now          = new Date();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [student,    setStudent]    = useState(null);
  const [subjects,   setSubjects]   = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  // Subject config modal
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editSubjects,     setEditSubjects]     = useState([]);
  const [savingSubjects,   setSavingSubjects]   = useState(false);

  // Create fee record modal
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeMonth,     setFeeMonth]     = useState(now.getMonth() + 1);
  const [feeYear,      setFeeYear]      = useState(now.getFullYear());
  const [feeSubjects,  setFeeSubjects]  = useState([]);
  const [feeNotes,     setFeeNotes]     = useState('');
  const [feeError,     setFeeError]     = useState('');
  const [creatingFee,  setCreatingFee]  = useState(false);

  // Payment modal
  const [payRecord,      setPayRecord]      = useState(null);
  const [payAmount,      setPayAmount]      = useState('');
  const [payDate,        setPayDate]        = useState(now.toISOString().split('T')[0]);
  const [payNotes,       setPayNotes]       = useState('');
  const [payError,       setPayError]       = useState('');
  const [addingPayment,  setAddingPayment]  = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [stuRes, subRes, feeRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/students/${id}/subjects`),
        api.get(`/students/${id}/fees`, { params: { year: filterYear } }),
      ]);
      setStudent(stuRes.data);
      setSubjects(subRes.data);
      setFeeRecords(feeRes.data);
    } catch {
      addToast('Failed to load student data', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, filterYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Subject Config ────────────────────────────────────────────────────────
  const openSubjectModal = () => {
    setEditSubjects(
      subjects.length > 0
        ? subjects.map(s => ({ subjectName: s.subjectName, monthlyAmount: String(s.monthlyAmount) }))
        : [{ subjectName: '', monthlyAmount: '' }]
    );
    setSubjectModalOpen(true);
  };

  const addSubjectRow    = () => setEditSubjects(p => [...p, { subjectName: '', monthlyAmount: '' }]);
  const removeSubjectRow = (i) => setEditSubjects(p => p.filter((_, idx) => idx !== i));
  const updateSubject    = (i, f, v) => setEditSubjects(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));

  const saveSubjects = async () => {
    setSavingSubjects(true);
    try {
      const payload = editSubjects.filter(s => s.subjectName.trim() && Number(s.monthlyAmount) >= 0);
      const res = await api.put(`/students/${id}/subjects`, payload);
      setSubjects(res.data);
      setSubjectModalOpen(false);
      addToast('Subject fees updated ✓');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update subjects', 'error');
    } finally {
      setSavingSubjects(false);
    }
  };

  // ─── Create Fee Record ────────────────────────────────────────────────────
  const openFeeModal = () => {
    setFeeSubjects(subjects.map(s => ({ subjectName: s.subjectName, amount: String(s.monthlyAmount) })));
    setFeeMonth(now.getMonth() + 1);
    setFeeYear(now.getFullYear());
    setFeeNotes('');
    setFeeError('');
    setFeeModalOpen(true);
  };

  const createFeeRecord = async () => {
    setFeeError('');
    const total = feeSubjects.reduce((s, sub) => s + Number(sub.amount || 0), 0);
    if (total <= 0) { setFeeError('Total fee must be greater than zero.'); return; }
    setCreatingFee(true);
    try {
      const res = await api.post(`/students/${id}/fees`, {
        month: feeMonth,
        year:  feeYear,
        subjectBreakdown: feeSubjects.map(s => ({ subjectName: s.subjectName, amount: Number(s.amount) })),
        notes: feeNotes,
      });
      setFeeRecords(prev => [res.data, ...prev]);
      setFeeModalOpen(false);
      addToast('Fee record created ✓');
    } catch (err) {
      setFeeError(err.response?.data?.error || 'Failed to create fee record.');
    } finally {
      setCreatingFee(false);
    }
  };

  // ─── Payment ──────────────────────────────────────────────────────────────
  const openPayModal = (record) => {
    setPayRecord(record);
    setPayAmount('');
    setPayDate(now.toISOString().split('T')[0]);
    setPayNotes('');
    setPayError('');
  };

  const submitPayment = async () => {
    setPayError('');
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { setPayError('Enter a valid payment amount.'); return; }
    if (amount > payRecord.remainingAmount + 0.001) {
      setPayError(`Amount exceeds remaining balance of ${fmt(payRecord.remainingAmount)}.`); return;
    }
    setAddingPayment(true);
    try {
      const res = await api.post(`/fees/${payRecord.id}/payments`, {
        amountPaid:  amount,
        paymentDate: payDate,
        notes:       payNotes,
      });
      setFeeRecords(prev => prev.map(r =>
        r.id === payRecord.id
          ? { ...res.data.feeRecord, monthName: r.monthName }
          : r
      ));
      setPayRecord(null);
      addToast('Payment recorded ✓');
    } catch (err) {
      setPayError(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setAddingPayment(false);
    }
  };

  // ─── Computed ─────────────────────────────────────────────────────────────
  const totalMonthlyFee = subjects.reduce((s, sub) => s + sub.monthlyAmount, 0);
  const editSubjectsTotal = editSubjects.reduce((s, sub) => s + Number(sub.monthlyAmount || 0), 0);
  const feeSubjectsTotal  = feeSubjects.reduce((s,  sub) => s + Number(sub.amount || 0),        0);

  const years = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 3; y--) years.push(y);

  // ─── Loading guard ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <div className="loading-screen" style={{ minHeight: 'auto', padding: 80 }}>
            <div className="spinner" />
          </div>
        </main>
      </div>
    );
  }
  if (!student) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Back */}
        <button className="back-link" onClick={() => navigate(`/class/${student.class}`)}>
          ← Class {student.class}
        </button>

        {/* ── Student Header ────────────────────────────────────────────── */}
        <div className="student-detail-header">
          <div className="student-avatar" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 22 }}>
            {student.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="student-detail-info">
            <div className="student-detail-name">{student.name}</div>
            <div className="student-detail-meta">
              <div className="student-detail-meta-item">🏫 Class {student.class}</div>
              {student.rollNumber  && <div className="student-detail-meta-item">🔢 Roll No: {student.rollNumber}</div>}
              {student.admissionDate && <div className="student-detail-meta-item">📅 Admitted: {student.admissionDate}</div>}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span className={`badge ${student.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
              {student.status}
            </span>
            <div className="fee-amount" style={{ fontSize: 22 }}>
              {fmt(totalMonthlyFee)}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>/month</span>
            </div>
          </div>
        </div>

        {/* ── Subject Fee Configuration ─────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2 className="card-title">📋 Subject-wise Monthly Fee</h2>
            <button className="btn btn-secondary btn-sm" onClick={openSubjectModal}>
              ✏️ {subjects.length > 0 ? 'Edit Subjects' : 'Configure Subjects'}
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-state-text">No subjects configured yet.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={openSubjectModal}>
                Configure Subject Fees
              </button>
            </div>
          ) : (
            <div style={{ padding: '0 20px 16px' }}>
              <div className="subject-display-grid">
                {subjects.map(s => (
                  <div key={s.id} className="subject-chip">
                    <span className="subject-chip-name">{s.subjectName}</span>
                    <span className="subject-chip-amount">{fmt(s.monthlyAmount)}</span>
                  </div>
                ))}
              </div>
              <div className="subject-total-row">
                <span>Total Monthly Fee</span>
                <span className="fee-amount">{fmt(totalMonthlyFee)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Monthly Fee Records ───────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📅 Monthly Fee Records</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select className="form-select" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {subjects.length > 0 && (
                <button id="create-fee-btn" className="btn btn-primary btn-sm" onClick={openFeeModal}>
                  + Create Fee Record
                </button>
              )}
            </div>
          </div>

          {feeRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No fee records for {filterYear}</div>
              <div className="empty-state-text">
                {subjects.length === 0
                  ? 'Configure subject fees first, then create monthly fee records.'
                  : `Click "+ Create Fee Record" to add a record for ${filterYear}.`}
              </div>
            </div>
          ) : (
            <div style={{ padding: '0 20px 20px' }}>
              {/* Year summary */}
              <div className="fee-year-summary">
                <div className="fee-year-summary-item">
                  <span>Records</span>
                  <strong>{feeRecords.length}</strong>
                </div>
                <div className="fee-year-summary-item text-success">
                  <span>Total Collected</span>
                  <strong>{fmt(feeRecords.reduce((s, r) => s + r.amountPaid, 0))}</strong>
                </div>
                <div className="fee-year-summary-item text-danger">
                  <span>Total Remaining</span>
                  <strong>{fmt(feeRecords.reduce((s, r) => s + r.remainingAmount, 0))}</strong>
                </div>
              </div>

              {/* Individual records */}
              {feeRecords.map(record => (
                <div key={record.id} className="fee-record-block">
                  {/* Record header */}
                  <div className="fee-record-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="fee-record-month">{record.monthName} {record.year}</span>
                      <StatusBadge status={record.status} />
                    </div>
                    {record.status !== 'PAID' && (
                      <button
                        id={`pay-btn-${record.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => openPayModal(record)}
                      >
                        + Add Payment
                      </button>
                    )}
                  </div>

                  {/* Subject breakdown */}
                  <div className="fee-breakdown-table">
                    {record.subjectBreakdown.map(s => (
                      <div key={s.id} className="fee-breakdown-row">
                        <span className="fee-breakdown-subject">{s.subjectName}</span>
                        <span className="fee-breakdown-amount">{fmt(s.amount)}</span>
                      </div>
                    ))}
                    <div className="fee-breakdown-row fee-breakdown-total">
                      <span>Total Fee</span>
                      <span className="fee-amount">{fmt(record.totalFee)}</span>
                    </div>
                  </div>

                  {/* Payment history */}
                  {record.payments.length > 0 && (
                    <div className="payment-history">
                      <div className="payment-history-title">💰 Payment History</div>
                      {record.payments.map((p, i) => (
                        <div key={p.id} className="payment-history-row">
                          <span className="payment-idx">Payment {i + 1}</span>
                          <span className="payment-date-val">{p.paymentDate}</span>
                          <span className="payment-amt text-success">+{fmt(p.amountPaid)}</span>
                          {p.notes && <span className="payment-note-val">{p.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Record summary */}
                  <div className="fee-record-summary">
                    <div className="fee-record-summary-item">
                      <span className="fee-record-summary-label">Total Paid</span>
                      <span className="fee-record-summary-value text-success">{fmt(record.amountPaid)}</span>
                    </div>
                    <div className="fee-record-summary-divider" />
                    <div className="fee-record-summary-item">
                      <span className="fee-record-summary-label">Remaining</span>
                      <span className={`fee-record-summary-value ${record.remainingAmount > 0 ? 'text-danger' : 'text-success'}`}>
                        {fmt(record.remainingAmount)}
                      </span>
                    </div>
                    <div className="fee-record-summary-divider" />
                    <StatusBadge status={record.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Subject Config Modal ──────────────────────────────────────── */}
        <Modal
          isOpen={subjectModalOpen}
          onClose={() => setSubjectModalOpen(false)}
          title="Configure Subject-wise Fees"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setSubjectModalOpen(false)} disabled={savingSubjects}>Cancel</button>
              <button id="save-subjects-btn" className="btn btn-primary" onClick={saveSubjects} disabled={savingSubjects}>
                {savingSubjects ? 'Saving...' : 'Save Subject Fees'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Set the monthly amount for each subject. These will be used as defaults when creating fee records.
          </p>
          {editSubjects.map((s, i) => (
            <div key={i} className="subject-edit-row">
              <input
                className="form-input"
                placeholder="Subject name (e.g. Physics)"
                value={s.subjectName}
                onChange={e => updateSubject(i, 'subjectName', e.target.value)}
                style={{ flex: 2 }}
              />
              <input
                className="form-input"
                type="number"
                placeholder="Amount"
                value={s.monthlyAmount}
                onChange={e => updateSubject(i, 'monthlyAmount', e.target.value)}
                min="0"
                style={{ flex: 1 }}
              />
              <button className="btn btn-danger btn-sm" onClick={() => removeSubjectRow(i)}>✕</button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={addSubjectRow} style={{ marginTop: 8 }}>
            + Add Subject
          </button>
          <div className="subject-edit-total">
            Total: <strong>{fmt(editSubjectsTotal)}</strong>
          </div>
        </Modal>

        {/* ── Create Fee Record Modal ───────────────────────────────────── */}
        <Modal
          isOpen={feeModalOpen}
          onClose={() => setFeeModalOpen(false)}
          title="Create Monthly Fee Record"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setFeeModalOpen(false)} disabled={creatingFee}>Cancel</button>
              <button id="create-record-btn" className="btn btn-primary" onClick={createFeeRecord} disabled={creatingFee}>
                {creatingFee ? 'Creating...' : 'Create Record'}
              </button>
            </>
          }
        >
          {feeError && <div className="login-error" style={{ marginBottom: 16 }}><span>⚠️</span>{feeError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={feeMonth} onChange={e => setFeeMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={feeYear} onChange={e => setFeeYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
            Subject fee amounts (edit if this month differs):
          </p>
          {feeSubjects.map((s, i) => (
            <div key={i} className="subject-edit-row">
              <span style={{ flex: 2, color: 'var(--text-secondary)', fontSize: 14, alignSelf: 'center' }}>
                {s.subjectName}
              </span>
              <input
                className="form-input"
                type="number"
                value={s.amount}
                onChange={e => setFeeSubjects(prev => prev.map((sub, idx) => idx === i ? { ...sub, amount: e.target.value } : sub))}
                min="0"
                style={{ flex: 1 }}
              />
            </div>
          ))}
          <div className="subject-edit-total">
            Total Fee: <strong>{fmt(feeSubjectsTotal)}</strong>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Notes <span className="optional">(optional)</span></label>
            <input
              className="form-input"
              placeholder="e.g. Concession applied"
              value={feeNotes}
              onChange={e => setFeeNotes(e.target.value)}
            />
          </div>
        </Modal>

        {/* ── Add Payment Modal ─────────────────────────────────────────── */}
        <Modal
          isOpen={!!payRecord}
          onClose={() => setPayRecord(null)}
          title={payRecord ? `Add Payment — ${payRecord.monthName} ${payRecord.year}` : ''}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPayRecord(null)} disabled={addingPayment}>Cancel</button>
              <button id="submit-payment-btn" className="btn btn-primary" onClick={submitPayment} disabled={addingPayment}>
                {addingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </>
          }
        >
          {payRecord && (
            <>
              {payError && <div className="login-error" style={{ marginBottom: 16 }}><span>⚠️</span>{payError}</div>}

              <div className="pay-summary-box">
                <div className="pay-summary-row">
                  <span>Total Fee</span>
                  <span>{fmt(payRecord.totalFee)}</span>
                </div>
                <div className="pay-summary-row">
                  <span>Already Paid</span>
                  <span className="text-success">{fmt(payRecord.amountPaid)}</span>
                </div>
                <div className="pay-summary-row pay-summary-highlight">
                  <span>Remaining</span>
                  <span className="text-danger">{fmt(payRecord.remainingAmount)}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Paid (Rs.)</label>
                <input
                  id="pay-amount-input"
                  className="form-input"
                  type="number"
                  placeholder={`Max: Rs. ${payRecord.remainingAmount}`}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  min="1"
                  max={payRecord.remainingAmount}
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes <span className="optional">(optional)</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. Cash received"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </Modal>
      </main>
    </div>
  );
}
