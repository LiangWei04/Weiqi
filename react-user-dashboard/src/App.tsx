import { demoMode } from './utils/demo';
import { Navigate, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import DashboardPage from './components/DashboardPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import OAuthCallbackPage from './components/OAuthCallbackPage';
import './App.css';
import './rose-theme.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={demoMode ? <Navigate to="/login" replace /> : <SignUpPage />} />
      <Route path="/forgot-password" element={demoMode ? <Navigate to="/login" replace /> : <ForgotPasswordPage />} />
      <Route path="/verify-email" element={demoMode ? <Navigate to="/login" replace /> : <VerifyEmailPage />} />
      <Route path="/oauth-callback" element={demoMode ? <Navigate to="/login" replace /> : <OAuthCallbackPage />} />
      <Route path="/dashboard" element={<DashboardPage view="analytics" />} />
      <Route path="/events" element={<DashboardPage view="events" />} />
      <Route path="/my-events" element={<DashboardPage view="my-events" />} />
      <Route path="/events/create" element={<DashboardPage view="event-create" />} />
      <Route path="/competitions" element={<DashboardPage view="competitions" />} />
      <Route path="/competitions/create" element={<DashboardPage view="competition-create" />} />
      <Route path="/drafts" element={<DashboardPage view="drafts" />} />
      <Route path="/attendance" element={<DashboardPage view="attendance" />} />
      <Route path="/members" element={<DashboardPage view="members" />} />
      <Route path="/registrations" element={<Navigate to="/attendance" replace />} />
      <Route path="/users" element={<DashboardPage view="users" />} />
      <Route path="/settings" element={<DashboardPage view="settings" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
