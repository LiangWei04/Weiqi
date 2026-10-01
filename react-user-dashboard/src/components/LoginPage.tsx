import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { getApiErrorMessage } from '../utils/apiErrors';
import { demoMode } from '../utils/demo';
import DemoEntry from './demo/DemoEntry';

interface LoginFormInputs {
  identifier: string;
  password: string;
}

const LoginPage: React.FC = () => {
  return demoMode ? <DemoEntry /> : <NormalLoginPage />;
};

const NormalLoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = React.useState('');

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      const response = await apiClient.post('/auth/login', data);
      interface LoginResponse {
        token: string;
        userId: number;
        role?: string;
      }
      const { token, userId, role } = response.data as LoginResponse;
      localStorage.setItem('authToken', token);
      localStorage.setItem('userId', String(userId));
      if (role) {
        localStorage.setItem('role', role);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      setErrorMessage(getApiErrorMessage(error, 'Login failed. Check your username/email, password, and email verification status.'));
    }
  };

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-brand">
          <span>TourneysHub</span>
          <strong>Competition operations for Weiqi CCA</strong>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="auth-card">
          <p className="eyebrow">Welcome back</p>
          <h1 id="login-title">Login</h1>
          <div className="form-field">
            <label htmlFor="identifier">Username or Email</label>
          <input
            id="identifier"
            type="text"
            {...register('identifier', { required: 'Username or email is required' })}
          />
            {errors.identifier && <p className="field-error">{errors.identifier.message}</p>}
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
          {errorMessage && <p className="notice notice-error">{errorMessage}</p>}
          <button type="submit" className="primary-action">Login</button>
          <button type="button" className="secondary-action" onClick={loginWithGoogle}>
            Continue with Google
          </button>
          <div className="auth-links">
            <Link to="/signup">Create account</Link>
            <Link to="/forgot-password">Forgot password</Link>
          </div>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
