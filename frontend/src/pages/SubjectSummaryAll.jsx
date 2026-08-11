import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmt = (n) => (n ? `Rs. ${Number(n).toLocaleString('en-PK')}` : 'Rs. 0');

export default function SubjectSummaryAll() {
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
      const res = await api.get('/classes/combined-summary', {
        params: { month: selMonth, year: selYear },
      });
      setData(res.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load combined summary', 'error');
    } finally {
      setLoading(false);
    }
  }, [selMonth, selYear]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const pct = (subject) => {
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
            <button className="back-link" onClick={() => navigate('/dashboard')}>
              ← Dashboard
            </button>
            <h1 className="page-title">Subject Fee Summary</h1>
            <p className="page-subtitle">
              Combined fee collection across <strong>Class 11 &amp; Class 12</strong>.
              Only <strong>PAID</strong> records count toward "Collected".
            </p>
          </div>

          {/* Month / Year picker */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="ledger-date-picker">
              <span className="ledger-date-label">Month:</span>
              <select
                id="all-subject-month"
                className="form-select"
                value={selMonth}
                onChange={e => setSelMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select
                id="all-subject-year"
                className="form-select"
                value={selYear}
                onChange={e => setSelYear(Number(e.target.value))}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Banner */}
        {data && (
          <div className="subject-dash-banner">
            <div className="subject-dash-banner-item">
              <span className="subject-dash-banner-label">📚 Subjects Tracked</span>
              <strong className="subject-dash-banner-value">{data.subjects.length}</strong>
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

        {/* Quick-jump links */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/class/11/subjects')}>
            📚 Class 11 Details
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/class/12/subjects')}>
            🎓 Class 12 Details
          </button>
        </div>

        {/* Subject Cards */}
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : !data || data.subjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No data for {MONTHS[selMonth - 1]} {selYear}</div>
            <div className="empty-state-text">
              Record fee payments for students in Class 11 or Class 12 to see subject totals here.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/class/11')}>
                Go to Class 11
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/class/12')}>
                Go to Class 12
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="subject-dash-period-label">
              📅 {MONTHS[selMonth - 1]} {selYear} &nbsp;·&nbsp; Class 11 + Class 12 Combined
            </div>

            <div className="subject-dash-grid">
              {data.subjects.map(subject => {
                const collected = pct(subject);
                const isFullyCollected = subject.totalOwed > 0 && subject.totalCollected >= subject.totalOwed;

                return (
                  <div
                    key={subject.subjectName}
                    className={`subject-dash-card${isFullyCollected ? ' subject-dash-card--paid' : ''}`}
                  >
                    {/* Card header */}
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
                            style={{ width: `${collected}%` }}
                          />
                        </div>
                        <span className="subject-dash-progress-pct">{collected}%</span>
                      </div>
                    )}

                    {/* Both-class note */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4 }}>
                      Class 11 + Class 12 combined
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
