import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [adminPassword, setAdminPassword] = useState('');
  const [memberPin, setMemberPin] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [memberError, setMemberError] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    if (!adminPassword.trim()) { setAdminError('Please enter the admin pin'); return; }
    setAdminLoading(true);
    try {
      const res = await api.post('/auth/login', { password: adminPassword.trim() });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      const apiError = err.response?.data;
      if (apiError?.message) {
        setAdminError(`${apiError.error}: ${apiError.message}`);
      } else {
        setAdminError(apiError?.error || 'Invalid password. Please try again.');
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleMemberLogin = async (e) => {
    e.preventDefault();
    setMemberError('');
    if (!memberPin.trim()) { setMemberError('Please enter the member PIN.'); return; }
    setMemberLoading(true);
    try {
      const res = await api.post('/auth/member-login', { pin: memberPin.trim() });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      const apiError = err.response?.data;
      setMemberError(apiError?.error || 'Invalid PIN. Please try again.');
    } finally {
      setMemberLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        {/* Header */}
        <div className="login-logo">
          <div className="login-logo-title">Pak Academy Fee System</div>
          <div className="login-logo-subtitle">Select your access level to continue</div>
        </div>

        {/* ── Admin Login Section ── */}
        <div className="login-section">
          <div className="login-section-label">
            Admin Login
          </div>
          {adminError && (
            <div className="login-error">
              {adminError}
            </div>
          )}
          <form onSubmit={handleAdminLogin} autoComplete="off">
            <div className="form-group">
              <label className="form-label">Admin Password</label>
              <input
                id="admin-password"
                className="form-input"
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button
              id="admin-login-btn"
              className="btn btn-primary login-submit"
              type="submit"
              disabled={adminLoading}
            >
              {adminLoading ? 'Signing in...' : 'Admin Login'}
            </button>
          </form>
        </div>

        {/* ── Divider ── */}
        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="login-divider-text">or</span>
          <div className="login-divider-line" />
        </div>

        {/* ── Member Login Section ── */}
        <div className="login-section">
          <div className="login-section-label">
            Member Login <span className="login-section-hint">(View only)</span>
          </div>
          {memberError && (
            <div className="login-error">
              {memberError}
            </div>
          )}
          <form onSubmit={handleMemberLogin} autoComplete="off">
            <div className="form-group">
              <label className="form-label">Member PIN</label>
              <input
                id="member-pin"
                className="form-input"
                type="password"
                inputMode="numeric"
                placeholder="Enter member PIN"
                value={memberPin}
                onChange={(e) => setMemberPin(e.target.value)}
              />
            </div>
            <button
              id="member-login-btn"
              className="btn btn-secondary login-submit"
              type="submit"
              disabled={memberLoading}
            >
              {memberLoading ? 'Signing in...' : 'Member Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
