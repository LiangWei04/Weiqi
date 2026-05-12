import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (token && userId) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userId', userId);
      if (role) {
        localStorage.setItem('role', role);
      }
      navigate('/dashboard', { replace: true });
      return;
    }

    navigate('/login', { replace: true });
  }, [navigate, searchParams]);

  return (
    <main className="auth-page">
      <div className="auth-card status-card">
        <p className="eyebrow">Google OAuth</p>
        <h1>Signing you in</h1>
        <p className="status-muted">Please wait while your session is created.</p>
      </div>
    </main>
  );
};

export default OAuthCallbackPage;
