import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) { setError('Please enter the admin password.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { password: password.trim() });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      const apiError = err.response?.data;
      if (apiError?.message) {
        setError(`${apiError.error}: ${apiError.message}`);
      } else {
        setError(apiError?.error || 'Invalid password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-title">Pak Academy Fee System</div>
          <div className="login-logo-subtitle">Admin Access Only</div>
        </div>

        {error && (
          <div className="login-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} autoComplete="off">
          <div className="form-group">
            <label className="form-label">Admin Password</label>
            <input
              id="admin-password"
              className="form-input"
              type="password"
              placeholder="Enter academy admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <button
            id="login-btn"
            className="btn btn-primary login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : '🔑 Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
