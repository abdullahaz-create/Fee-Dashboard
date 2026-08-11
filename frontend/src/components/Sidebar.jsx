import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { }
    logout();
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>☰</button>
        <span className="mobile-logo">Pak Academy Fee Manager</span>
      </div>

      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-title">
            <div className="logo-icon">🎓</div>
            Pak Academy
          </div>
          <div className="sidebar-logo-subtitle">Fee Manager</div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <span className="nav-icon"></span>
            Dashboard
          </NavLink>

          <NavLink
            to="/class/11"
            end
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <span className="nav-icon"></span>
            Class 11
          </NavLink>

          <NavLink
            to="/class/12"
            end
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <span className="nav-icon"></span>
            Class 12
          </NavLink>

          <NavLink
            to="/subject-summary"
            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <span className="nav-icon"></span>
            Subject Summary
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">Administrator</div>
            <div className="sidebar-user-role">Academy Admin</div>
          </div>
          <button className="sidebar-nav-link btn-ghost" onClick={handleLogout}>
            <span className="nav-icon"></span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
