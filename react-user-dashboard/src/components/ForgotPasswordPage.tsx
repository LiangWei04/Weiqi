import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { getApiErrorMessage } from '../utils/apiErrors';

interface ForgotPasswordFormInputs {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

const ForgotPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormInputs>();
  const [message, setMessage] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [step, setStep] = React.useState<'request' | 'reset'>('request');
  const [devCode, setDevCode] = React.useState('');

  const requestCode = async (data: ForgotPasswordFormInputs) => {
    try {
      const response = await apiClient.post<{ message: string; resetCode?: string }>('/auth/forgot-password', { email: data.email });
      setEmail(data.email);
      setStep('reset');
      setDevCode(response.data.resetCode || '');
      setMessage(response.data.message || 'If this email is registered, a password reset code will be sent.');
    } catch (error) {
      console.error('Forgot password request failed:', error);
      setMessage(getApiErrorMessage(error, 'Failed to process the request. Please try again.'));
    }
  };

  const resetPassword = async (data: ForgotPasswordFormInputs) => {
    if (data.password !== data.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      const response = await apiClient.post<{ message: string }>('/auth/reset-password', {
        email,
        code: data.code,
        password: data.password,
      });
      setMessage(response.data.message || 'Password reset successfully. You can now login.');
    } catch (error) {
      console.error('Password reset failed:', error);
      setMessage(getApiErrorMessage(error, 'Could not reset password. Please check the code and try again.'));
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel-single" aria-labelledby="forgot-title">
        <form onSubmit={handleSubmit(step === 'request' ? requestCode : resetPassword)} className="auth-card">
          <p className="eyebrow">Account recovery</p>
          <h1 id="forgot-title">{step === 'request' ? 'Forgot Password' : 'Reset Password'}</h1>
          <div className="form-field">
            <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            disabled={step === 'reset'}
            {...register('email', { required: 'Email is required' })}
          />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          {step === 'reset' && (
            <>
              <div className="form-field">
                <label htmlFor="code">Verification Code</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  {...register('code', { required: 'Verification code is required' })}
                />
                {errors.code && <p className="field-error">{errors.code.message}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="password">New Password</label>
                <input
                  id="password"
                  type="password"
                  {...register('password', { required: 'New password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })}
                />
                {errors.password && <p className="field-error">{errors.password.message}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword', { required: 'Please confirm your new password' })}
                />
                {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
              </div>
            </>
          )}
          <button type="submit" className="primary-action">{step === 'request' ? 'Send Code' : 'Reset Password'}</button>
          {message && <p className="notice">{message}</p>}
          {devCode && <p className="notice">Development reset code: {devCode}</p>}
          <div className="auth-links">
            <Link to="/login">Back to Login</Link>
            {step === 'reset' && (
              <button type="button" className="ghost-action" onClick={() => {
                setStep('request');
                setMessage('');
                setDevCode('');
              }}>
                Use another email
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
