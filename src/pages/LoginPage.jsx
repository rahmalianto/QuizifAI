import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        <div className="auth-header">
          <div className="logo-wrapper">
            <Zap size={28} color="white" />
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your QuizifAI account</p>
        </div>

        {error && (
          <div className="auth-error" id="login-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="input-group">
            <label htmlFor="login-email">Email</label>
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
                id="login-email"
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
            <label htmlFor="login-password">Password</label>
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
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                style={{ paddingLeft: '36px' }}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            id="btn-sign-in"
          >
            {loading ? (
              <>
                <div className="spinner">
                  <div className="spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                </div>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
