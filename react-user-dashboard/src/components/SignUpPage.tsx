import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';

interface SignUpFormInputs {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const SignUpPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<SignUpFormInputs>();
  const navigate = useNavigate();
  const [verificationLink, setVerificationLink] = React.useState('');
  const [message, setMessage] = React.useState('');

  const onSubmit = async (data: SignUpFormInputs) => {
    if (data.password !== data.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await apiClient.post('/auth/register', { username: data.username, email: data.email, password: data.password });
      const result = response.data as { message?: string; verificationLink?: string };
      setMessage(result.message || 'Account created. Please check your email to verify your account.');
      if (result.verificationLink) {
        const linkUrl = new URL(result.verificationLink);
        setVerificationLink(`${linkUrl.pathname}${linkUrl.search}`);
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      setMessage('Failed to sign up. Please check the details and try again.');
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="signup-title">
        <div className="auth-brand">
          <span>TourneysHub</span>
          <strong>Build tournament records from registration to ranking</strong>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="auth-card">
          <p className="eyebrow">New member</p>
          <h1 id="signup-title">Create account</h1>
          <div className="form-field">
            <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            {...register('username', { required: 'Username is required' })}
          />
            {errors.username && <p className="field-error">{errors.username.message}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            {...register('email', { required: 'Email is required' })}
          />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            {...register('password', { required: 'Password is required' })}
          />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword', { required: 'Please confirm your password' })}
          />
            {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" className="primary-action">Create account</button>
          {message && <p className="notice">{message}</p>}
        {verificationLink && (
            <div className="verification-fallback">
            <button
              type="button"
              onClick={() => navigate(verificationLink)}
                className="secondary-action"
            >
              Verify Email Now
            </button>
          </div>
        )}
          <div className="auth-links">
            <Link to="/login">Already have an account? Login</Link>
          </div>
        </form>
      </section>
    </main>
  );
};

export default SignUpPage;
