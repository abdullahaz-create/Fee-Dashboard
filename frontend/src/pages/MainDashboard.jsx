import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function MainDashboard() {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Academy Dashboard</h1>
            <p className="page-subtitle">Select a class to manage students and fee records</p>
          </div>
        </div>

        <div className="class-cards-grid">
          <div className="class-card class-card-11" onClick={() => navigate('/class/11')}>
            <div className="class-card-icon"></div>
            <div className="class-card-content">
              <div className="class-card-label">Class 11</div>
              <div className="class-card-sub">View &amp; Manage Students · Fee Records · Monthly Payments</div>
            </div>
            <div className="class-card-arrow">→</div>
          </div>

          <div className="class-card class-card-12" onClick={() => navigate('/class/12')}>
            <div className="class-card-icon"></div>
            <div className="class-card-content">
              <div className="class-card-label">Class 12</div>
              <div className="class-card-sub">View &amp; Manage Students · Fee Records · Monthly Payments</div>
            </div>
            <div className="class-card-arrow">→</div>
          </div>
        </div>
      </main>
    </div>
  );
}
