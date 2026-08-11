import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmt = (n) => (n ? `Rs. ${Number(n).toLocaleString('en-PK')}` : 'Rs. 0');

export default function SubjectDashboard() {
  const { cls }      = useParams();
  const { addToast } = useToast();
  const navigate     = useNavigate();
  const now          = new Date();

  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);

  const years = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 3; y--) years.push(y);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/classes/${cls}/subject-summary`, {
        params: { month: selMonth, year: selYear },
      });
      setData(res.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load subject summary', 'error');
    } finally {
      setLoading(false);
    }
  }, [cls, selMonth, selYear]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const pctCollected = (subject) => {
    if (!subject.totalOwed) return 0;
    return Math.min(100, Math.round((subject.totalCollected / subject.totalOwed) * 100));
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* Header */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <button className="back-link" onClick={() => navigate(`/class/${cls}`)}>
              ← Class {cls} Register
            </button>
            <h1 className="page-title">Class {cls} — Subject Fee Summary</h1>
            <p className="page-subtitle">
              Subject-wise fee collection. Only <strong>PAID</strong> records count toward "Collected".
            </p>
          </div>

          {/* Month / Year picker */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="ledger-date-picker">
              <span className="ledger-date-label">Month:</span>
              <select
                id="subject-select-month"
                className="form-select"
                value={selMonth}
                onChange={e => setSelMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select
                id="subject-select-year"
                className="form-select"
                value={selYear}
                onChange={e => setSelYear(Number(e.target.value))}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Class Summary Banner */}
        {data && (
          <div className="subject-dash-banner">
            <div className="subject-dash-banner-item">
              <span className="subject-dash-banner-label">👥 Total Students</span>
              <strong className="subject-dash-banner-value">{data.summary.totalStudents}</strong>
            </div>
            <div className="subject-dash-banner-item">
              <span className="subject-dash-banner-label">💰 Total Owed</span>
              <strong className="subject-dash-banner-value">{fmt(data.summary.totalOwed)}</strong>
            </div>
            <div className="subject-dash-banner-item subject-dash-banner-item--green">
              <span className="subject-dash-banner-label">✅ Total Collected</span>
              <strong className="subject-dash-banner-value">{fmt(data.summary.totalCollected)}</strong>
            </div>
            <div className="subject-dash-banner-item subject-dash-banner-item--red">
              <span className="subject-dash-banner-label">⏳ Remaining</span>
              <strong className="subject-dash-banner-value">
                {fmt(data.summary.totalOwed - data.summary.totalCollected)}
              </strong>
            </div>
          </div>
        )}

        {/* Subject Cards */}
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : !data || data.subjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No subject data for {MONTHS[selMonth - 1]} {selYear}</div>
            <div className="empty-state-text">
              Add students to Class {cls}, configure their subject fees, then record payments.
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => navigate(`/class/${cls}`)}
            >
              Go to Class {cls} Register
            </button>
          </div>
        ) : (
          <>
            <div className="subject-dash-period-label">
              📅 {MONTHS[selMonth - 1]} {selYear} &nbsp;·&nbsp; Class {cls}
            </div>

            <div className="subject-dash-grid">
              {data.subjects.map(subject => {
                const pct = pctCollected(subject);
                const isFullyCollected =
                  subject.totalOwed > 0 && subject.totalCollected >= subject.totalOwed;

                return (
                  <div
                    key={subject.subjectName}
                    className={`subject-dash-card${isFullyCollected ? ' subject-dash-card--paid' : ''}`}
                  >
                    {/* Card Header */}
                    <div className="subject-dash-card-header">
                      <div className="subject-dash-card-name">{subject.subjectName}</div>
                      {isFullyCollected && (
                        <span className="subject-dash-fully-badge">✓ Fully Collected</span>
                      )}
                    </div>

                    {/* Amounts */}
                    <div className="subject-dash-card-amounts">
                      <div className="subject-dash-amount-block subject-dash-amount-block--green">
                        <span className="subject-dash-amount-label">Collected (PAID)</span>
                        <span className="subject-dash-amount-value">{fmt(subject.totalCollected)}</span>
                      </div>
                      <div className="subject-dash-amount-block">
                        <span className="subject-dash-amount-label">Total Owed</span>
                        <span className="subject-dash-amount-value subject-dash-amount-muted">
                          {fmt(subject.totalOwed)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {subject.totalOwed > 0 && (
                      <div className="subject-dash-progress-wrap">
                        <div className="subject-dash-progress-bar">
                          <div
                            className="subject-dash-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="subject-dash-progress-pct">{pct}%</span>
                      </div>
                    )}

                    {/* Status counts */}
                    <div className="subject-dash-counts">
                      <span className="subject-dash-count subject-dash-count--paid">
                        ✓ {subject.paidCount} Paid
                      </span>
                      {subject.partialCount > 0 && (
                        <span className="subject-dash-count subject-dash-count--partial">
                          ◑ {subject.partialCount} Partial
                        </span>
                      )}
                      {subject.unpaidCount > 0 && (
                        <span className="subject-dash-count subject-dash-count--unpaid">
                          ✗ {subject.unpaidCount} Unpaid
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
