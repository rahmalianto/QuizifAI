import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const { user } = await signUp(email, password);

      // If email confirmation is required, show success message
      if (user && !user.confirmed_at) {
        setSuccess(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-in" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'var(--success-50)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-5)',
            }}
          >
            <CheckCircle size={28} style={{ color: 'var(--success-500)' }} />
          </div>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Check Your Email</h2>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
            Click the link to activate your account.
          </p>
          <Link to="/login" className="btn btn-primary">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        <div className="auth-header">
          <div className="logo-wrapper">
            <Zap size={28} color="white" />
          </div>
          <h1>Create Account</h1>
          <p>Get started with QuizifAI</p>
        </div>

        {error && (
          <div className="auth-error" id="register-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="input-group">
            <label htmlFor="register-email">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-400)',
                }}
              />
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ paddingLeft: '36px' }}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="register-password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-400)',
                }}
              />
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                style={{ paddingLeft: '36px' }}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="register-confirm-password">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-400)',
                }}
              />
              <input
                id="register-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                style={{ paddingLeft: '36px' }}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            id="btn-register"
          >
            {loading ? (
              <>
                <div className="spinner">
                  <div className="spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                </div>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
