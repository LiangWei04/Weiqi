import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../utils/apiClient';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = React.useState('Verifying your email...');
  const [isSuccess, setIsSuccess] = React.useState(false);

  React.useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setMessage('Verification token is missing.');
      return;
    }

    apiClient
      .post('/auth/verify-email', { token })
      .then(() => {
        setIsSuccess(true);
        setMessage('Your email has been verified successfully.');
      })
      .catch(() => {
        setIsSuccess(false);
        setMessage('This verification link is invalid or expired.');
      });
  }, [searchParams]);

  return (
    <main className="auth-page">
      <div className="auth-card status-card">
        <p className="eyebrow">Account status</p>
        <h1>Email Verification</h1>
        <p className={isSuccess ? 'status-success' : 'status-muted'}>{message}</p>
        <Link to="/login" className="primary-link">Back to Login</Link>
      </div>
    </main>
  );
};

export default VerifyEmailPage;
