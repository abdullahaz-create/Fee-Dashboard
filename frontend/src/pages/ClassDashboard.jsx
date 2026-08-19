import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import api from '../api/axios';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Exact subject list requested by user
const EXACT_SUBJECTS = [
  'Physics',
  'Math',
  'English',
  'Computer',
  'Urdu',
  'Chemistry',
  'Biology',
  'Islamiat',
];

const fmt = (n) => (n ? `Rs. ${Number(n).toLocaleString('en-PK')}` : 'Rs. 0');

export default function ClassDashboard() {
  const { cls }       = useParams();
  const { addToast }  = useToast();
  const { isAdmin }   = useAuth();
  const navigate      = useNavigate();
  const now           = new Date();

  const [selMonth,  setSelMonth]  = useState(now.getMonth() + 1);
  const [selYear,   setSelYear]   = useState(now.getFullYear());
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  // Add / Edit Student modal
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editStudent,      setEditStudent]      = useState(null);
  const [studentForm,      setStudentForm]      = useState({
    name: '', fatherName: '', rollNumber: '', contact: '', notes: ''
  });
  const [subjectFees,      setSubjectFees]      = useState(
    EXACT_SUBJECTS.map(s => ({ subjectName: s, monthlyAmount: '' }))
  );
  const [formError,        setFormError]        = useState('');
  const [savingStudent,    setSavingStudent]    = useState(false);

  // Payment / Fee modal
  const [payModalOpen,  setPayModalOpen]  = useState(false);
  const [payTarget,     setPayTarget]     = useState(null);
  const [payAmount,     setPayAmount]     = useState('');
  const [payDate,       setPayDate]       = useState(now.toISOString().split('T')[0]);
  const [payNotes,      setPayNotes]      = useState('');
  const [payError,      setPayError]      = useState('');
  const [recordingPay,  setRecordingPay]  = useState(false);

  // Deactivate confirm
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  // ─── Fetch Class Data ───────────────────────────────────────────────────────
  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/classes/${cls}/ledger`, {
        params: { month: selMonth, year: selYear }
      });
      setStudents(res.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load class ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [cls, selMonth, selYear]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase().trim();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.rollNumber && String(s.rollNumber).toLowerCase().includes(q)) ||
      (s.contact && String(s.contact).toLowerCase().includes(q)) ||
      (s.fatherName && String(s.fatherName).toLowerCase().includes(q))
    );
  }, [students, search]);

  // Automatically calculate Total Fee from current subject inputs in modal
  const calculatedTotalModal = useMemo(() => {
    return subjectFees.reduce((sum, s) => sum + Number(s.monthlyAmount || 0), 0);
  }, [subjectFees]);

  // ─── Student Modal Handlers ─────────────────────────────────────────────────
  const openAddStudentModal = () => {
    setEditStudent(null);
    setStudentForm({ name: '', fatherName: '', rollNumber: '', contact: '', notes: '' });
    setSubjectFees(EXACT_SUBJECTS.map(s => ({ subjectName: s, monthlyAmount: '' })));
    setFormError('');
    setStudentModalOpen(true);
  };

  const openEditStudentModal = (student) => {
    setEditStudent(student);
    setStudentForm({
      name:        student.name,
      fatherName:  student.fatherName || '',
      rollNumber:  student.rollNumber || '',
      contact:     student.contact || '',
      notes:       student.notes || '',
    });

    const map = {};
    student.subjects?.forEach(s => { map[s.subjectName] = String(s.monthlyAmount); });

    const merged = EXACT_SUBJECTS.map(s => ({
      subjectName: s,
      monthlyAmount: map[s] || ''
    }));

    setSubjectFees(merged);
    setFormError('');
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async () => {
    setFormError('');
    if (!studentForm.name.trim()) { setFormError('Student name is required.'); return; }
    setSavingStudent(true);
    try {
      let stuId;
      if (editStudent) {
        stuId = editStudent.id;
        await api.put(`/students/${stuId}`, { ...studentForm, class: cls });
      } else {
        const res = await api.post('/students', { ...studentForm, class: cls });
        stuId = res.data.id;
      }

      // Save subject fees (only non-empty subjects)
      const validSubjects = subjectFees
        .filter(s => s.subjectName.trim() && Number(s.monthlyAmount) > 0)
        .map(s => ({ subjectName: s.subjectName.trim(), monthlyAmount: Number(s.monthlyAmount) }));

      await api.put(`/students/${stuId}/subjects`, validSubjects);

      addToast(editStudent ? 'Student updated successfully ✓' : 'Student added successfully ✓');
      setStudentModalOpen(false);
      fetchLedger();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save student.');
    } finally {
      setSavingStudent(false);
    }
  };

  // ─── Payment Modal Handlers ─────────────────────────────────────────────────
  const openPayModal = (student) => {
    setPayTarget(student);
    setPayAmount('');
    setPayDate(now.toISOString().split('T')[0]);
    setPayNotes('');
    setPayError('');
    setPayModalOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!payTarget) return;
    setPayError('');
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayError('Please enter a valid payment amount.');
      return;
    }

    setRecordingPay(true);
    try {
      let feeRecord = payTarget.feeRecords?.[0];

      // If no fee record exists for this month yet, auto-create from configured subjects
      if (!feeRecord) {
        const breakdown = payTarget.subjects?.map(s => ({
          subjectName: s.subjectName,
          amount: s.monthlyAmount
        })) || [];

        if (breakdown.length === 0) {
          setPayError('Please configure subject fees for this student first.');
          setRecordingPay(false);
          return;
        }

        const createRes = await api.post(`/students/${payTarget.id}/fees`, {
          month: selMonth,
          year: selYear,
          subjectBreakdown: breakdown,
        });
        feeRecord = createRes.data;
      }

      if (amt > feeRecord.remainingAmount + 0.01) {
        setPayError(`Payment amount cannot exceed remaining balance of ${fmt(feeRecord.remainingAmount)}.`);
        setRecordingPay(false);
        return;
      }

      await api.post(`/fees/${feeRecord.id}/payments`, {
        amountPaid: amt,
        paymentDate: payDate,
        notes: payNotes,
      });

      addToast(`Payment of ${fmt(amt)} recorded for ${payTarget.name} ✓`);
      setPayModalOpen(false);
      fetchLedger();
    } catch (err) {
      setPayError(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setRecordingPay(false);
    }
  };

  // ─── Delete Handler ────────────────────────────────────────────────────────
  const handleDeleteStudent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/students/${deleteTarget.id}`);
      addToast('Student deactivated ✓');
      setDeleteTarget(null);
      fetchLedger();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete student.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const years = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 3; y--) years.push(y);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Top Header & Month/Year Picker */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <button className="back-link" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            <h1 className="page-title">Class {cls} Fee Register</h1>
            <p className="page-subtitle">Simple, clean monthly fee records for Class {cls}</p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="ledger-date-picker">
              <span className="ledger-date-label">Month:</span>
              <select
                id="select-month"
                className="form-select"
                value={selMonth}
                onChange={e => setSelMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select
                id="select-year"
                className="form-select"
                value={selYear}
                onChange={e => setSelYear(Number(e.target.value))}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {isAdmin && (
              <button id="add-student-btn" className="btn btn-primary" onClick={openAddStudentModal}>
                + Add Student
              </button>
            )}
          </div>
        </div>

        {/* Clean White Register Table Card */}
        <div className="card ledger-card">
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <div className="ledger-header-title">
              📅 {MONTHS[selMonth - 1]} {selYear} Fee Table
              <span className="ledger-student-count">({filteredStudents.length} Students)</span>
            </div>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                id="search-students"
                placeholder="Search student, father name, roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">{search ? 'No students match search' : 'No students in Class ' + cls}</div>
              <div className="empty-state-text">
                {search ? `No student found matching "${search}"` : isAdmin ? 'Click "+ Add Student" to enter student profiles.' : 'No students have been added yet.'}
              </div>
              {!search && isAdmin && (
                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={openAddStudentModal}>
                  + Add Student
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="table ledger-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No.</th>
                    <th style={{ minWidth: 220, textAlign: 'left' }}>Student Name</th>
                    <th style={{ minWidth: 130, textAlign: 'right' }}>Total Fee</th>
                    <th style={{ minWidth: 90, textAlign: 'center' }}>Status</th>
                    {EXACT_SUBJECTS.map(sub => (
                      <th key={sub} style={{ textAlign: 'center', minWidth: 90 }}>{sub}</th>
                    ))}
                    <th style={{ minWidth: 100, textAlign: 'right' }}>Paid</th>
                    <th style={{ minWidth: 100, textAlign: 'right' }}>Remaining</th>
                    <th style={{ minWidth: 80, textAlign: 'center' }}>Roll No</th>
                    {isAdmin && <th style={{ minWidth: 100, textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, idx) => {
                    const record = student.feeRecords?.[0];

                    // Map subject fees
                    const subjectAmounts = {};
                    if (record && record.subjectBreakdown?.length > 0) {
                      record.subjectBreakdown.forEach(sb => {
                        subjectAmounts[sb.subjectName] = sb.amount;
                      });
                    } else {
                      student.subjects?.forEach(s => {
                        subjectAmounts[s.subjectName] = s.monthlyAmount;
                      });
                    }

                    // Total Fee auto calculated
                    const totalFee = record
                      ? record.totalFee
                      : EXACT_SUBJECTS.reduce((sum, sub) => sum + (Number(subjectAmounts[sub]) || 0), 0);

                    const amountPaid = record ? record.amountPaid : 0;
                    const remaining  = record ? record.remainingAmount : totalFee;
                    const status     = record ? record.status : (totalFee > 0 ? 'UNPAID' : 'PAID');

                    return (
                      <tr key={student.id}>
                        {/* 0. Row Number */}
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13 }}>
                          {idx + 1}
                        </td>

                        {/* 1. Student Name + Fee button inline (admin only) */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span>{student.name}</span>
                            {isAdmin && (
                              <button
                                id={`pay-btn-${student.id}`}
                                className="btn btn-primary btn-sm"
                                onClick={() => openPayModal(student)}
                                style={{ flexShrink: 0 }}
                              >
                                + Fee
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 2. Total Fee */}
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>
                          {fmt(totalFee)}
                        </td>

                        {/* 3. Status badge — right after Total Fee */}
                        <td style={{ textAlign: 'center' }}>
                          <StatusBadge status={status} />
                        </td>

                        {/* Subject Fee Columns: Physics, Math, English, Computer, Urdu, Chemistry, Biology, Islamiat */}
                        {EXACT_SUBJECTS.map(sub => {
                          const amt = subjectAmounts[sub];
                          return (
                            <td key={sub} style={{ textAlign: 'center', fontSize: 13 }}>
                              {amt !== undefined && amt > 0 ? (
                                <span className="subject-cell-val">{Number(amt).toLocaleString()}</span>
                              ) : (
                                <span className="subject-cell-dash">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Financial Status: Paid & Remaining */}
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                          {fmt(amountPaid)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {fmt(remaining)}
                        </td>

                        {/* Roll No */}
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {student.rollNumber || '—'}
                        </td>

                        {/* Actions: Edit + Delete only (admin only) */}
                        {isAdmin && (
                          <td>
                            <div className="fee-action-group" style={{ justifyContent: 'flex-end' }}>
                              <button
                                id={`edit-btn-${student.id}`}
                                className="btn btn-secondary btn-sm"
                                onClick={() => openEditStudentModal(student)}
                              >
                                Edit
                              </button>
                              <button
                                id={`del-btn-${student.id}`}
                                className="btn btn-danger btn-sm"
                                onClick={() => setDeleteTarget(student)}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Add / Edit Student Modal ───────────────────────────────────── */}
        <Modal
          isOpen={studentModalOpen}
          onClose={() => setStudentModalOpen(false)}
          title={editStudent ? `Edit Student — ${editStudent.name}` : `Add Student — Class ${cls}`}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setStudentModalOpen(false)} disabled={savingStudent}>Cancel</button>
              <button id="save-student-btn" className="btn btn-primary" onClick={handleSaveStudent} disabled={savingStudent}>
                {savingStudent ? 'Saving...' : editStudent ? 'Update Student' : 'Save Student'}
              </button>
            </>
          }
        >
          {formError && <div className="login-error" style={{ marginBottom: 16 }}><span>⚠️</span>{formError}</div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Student Name *</label>
              <input
                id="student-name-input"
                className="form-input"
                placeholder="e.g. Muhammad Ali"
                value={studentForm.name}
                onChange={e => setStudentForm(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Father Name</label>
              <input
                id="student-father-input"
                className="form-input"
                placeholder="e.g. Ahmed Ali"
                value={studentForm.fatherName}
                onChange={e => setStudentForm(p => ({ ...p, fatherName: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input
                id="student-roll-input"
                className="form-input"
                placeholder="e.g. 15"
                value={studentForm.rollNumber}
                onChange={e => setStudentForm(p => ({ ...p, rollNumber: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                id="student-contact-input"
                className="form-input"
                placeholder="e.g. 03001234567"
                value={studentForm.contact}
                onChange={e => setStudentForm(p => ({ ...p, contact: e.target.value }))}
              />
            </div>
          </div>

          <div className="divider" style={{ margin: '16px 0' }} />

          <label className="form-label" style={{ marginBottom: 8, display: 'block', fontWeight: 700 }}>
            Subject-wise Monthly Fees (Rs.)
          </label>
          <div className="subject-inputs-grid">
            {subjectFees.map((s, idx) => (
              <div key={idx} className="subject-input-item">
                <span className="subject-input-label">{s.subjectName}</span>
                <input
                  className="form-input"
                  type="number"
                  placeholder="0"
                  value={s.monthlyAmount}
                  onChange={e => setSubjectFees(prev => prev.map((item, i) => i === idx ? { ...item, monthlyAmount: e.target.value } : item))}
                  min="0"
                />
              </div>
            ))}
          </div>

          <div className="subject-total-summary">
            Calculated Total Fee: <strong>{fmt(calculatedTotalModal)}</strong>
          </div>
        </Modal>

        {/* ── Add Fee Payment Modal ──────────────────────────────────────── */}
        <Modal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={payTarget ? `Fee Payment — ${payTarget.name} (${MONTHS[selMonth - 1]} ${selYear})` : ''}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPayModalOpen(false)} disabled={recordingPay}>Cancel</button>
              <button id="submit-payment-btn" className="btn btn-primary" onClick={handleRecordPayment} disabled={recordingPay}>
                {recordingPay ? 'Recording...' : 'Record Payment'}
              </button>
            </>
          }
        >
          {payTarget && (() => {
            const record = payTarget.feeRecords?.[0];

            const subjectBreakdown = record?.subjectBreakdown?.length > 0
              ? record.subjectBreakdown.map(sb => ({ name: sb.subjectName, amount: sb.amount }))
              : payTarget.subjects?.map(s => ({ name: s.subjectName, amount: s.monthlyAmount })) || [];

            const totalFee = record ? record.totalFee : subjectBreakdown.reduce((sum, s) => sum + s.amount, 0);
            const paid = record ? record.amountPaid : 0;
            const remaining = record ? record.remainingAmount : totalFee;

            return (
              <>
                {payError && <div className="login-error" style={{ marginBottom: 16 }}><span>⚠️</span>{payError}</div>}

                <div className="pay-summary-box">
                  <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                    Subject Fee Breakdown ({MONTHS[selMonth - 1]} {selYear}):
                  </div>
                  {subjectBreakdown.map((sb, i) => (
                    <div key={i} className="pay-summary-row" style={{ fontSize: 13 }}>
                      <span>{sb.name}</span>
                      <span>{fmt(sb.amount)}</span>
                    </div>
                  ))}
                  <div className="pay-summary-row pay-summary-highlight">
                    <span>Total Calculated Fee</span>
                    <span>{fmt(totalFee)}</span>
                  </div>
                  <div className="pay-summary-row">
                    <span>Paid So Far</span>
                    <span className="text-success">{fmt(paid)}</span>
                  </div>
                  <div className="pay-summary-row">
                    <span>Remaining Balance</span>
                    <span className={remaining > 0 ? 'text-danger' : 'text-success'}>{fmt(remaining)}</span>
                  </div>
                </div>

                {remaining <= 0 ? (
                  <div style={{ textAlign: 'center', padding: 12, color: 'var(--success)', fontWeight: 700 }}>
                    ✅ Fee for {MONTHS[selMonth - 1]} {selYear} is fully paid.
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Amount Paid Now (Rs.) *</label>
                      <input
                        id="pay-amount-input"
                        className="form-input"
                        type="number"
                        placeholder={`Enter amount (Max: ${remaining})`}
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        min="1"
                        max={remaining}
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
              </>
            );
          })()}
        </Modal>

        {/* Deactivate Confirm */}
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteStudent}
          loading={deleting}
          title={`Remove ${deleteTarget?.name}?`}
          message="This student will be deactivated. Their fee history will be preserved."
          confirmLabel="Remove"
        />
      </main>
    </div>
  );
}
