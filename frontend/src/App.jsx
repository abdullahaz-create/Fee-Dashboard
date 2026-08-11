import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Login from './pages/Login';
import MainDashboard from './pages/MainDashboard';
import ClassDashboard from './pages/ClassDashboard';
import StudentDetail from './pages/StudentDetail';
import SubjectDashboard from './pages/SubjectDashboard';
import SubjectSummaryAll from './pages/SubjectSummaryAll';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"              element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/dashboard"          element={<PrivateRoute><MainDashboard /></PrivateRoute>} />
      <Route path="/subject-summary"     element={<PrivateRoute><SubjectSummaryAll /></PrivateRoute>} />
      <Route path="/class/:cls"          element={<PrivateRoute><ClassDashboard /></PrivateRoute>} />
      <Route path="/class/:cls/subjects" element={<PrivateRoute><SubjectDashboard /></PrivateRoute>} />
      <Route path="/students/:id"        element={<PrivateRoute><StudentDetail /></PrivateRoute>} />
      <Route path="*"                    element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
