import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import apiClient from '../utils/apiClient';

interface ForgotPasswordFormInputs {
  email: string;
}

const ForgotPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormInputs>();
  const [message, setMessage] = React.useState('');

  const onSubmit = async (data: ForgotPasswordFormInputs) => {
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setMessage('If this email is registered, you will receive a password reset link.');
    } catch (error) {
      console.error('Forgot password request failed:', error);
      setMessage('Failed to process the request. Please try again.');
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel-single" aria-labelledby="forgot-title">
        <form onSubmit={handleSubmit(onSubmit)} className="auth-card">
          <p className="eyebrow">Account recovery</p>
          <h1 id="forgot-title">Forgot Password</h1>
          <div className="form-field">
            <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            {...register('email', { required: 'Email is required' })}
          />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          <button type="submit" className="primary-action">Submit</button>
          {message && <p className="notice">{message}</p>}
          <div className="auth-links">
            <Link to="/login">Back to Login</Link>
          </div>
        </form>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
