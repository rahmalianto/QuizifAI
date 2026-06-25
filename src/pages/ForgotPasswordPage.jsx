import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
      toast.success('Password reset link sent!');
    } catch (err) {
      setError(err.message || 'Failed to send reset link');
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
          <h1>Reset Password</h1>
          <p>Enter your email to receive a reset link</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ 
              background: 'var(--success-50)', 
              color: 'var(--success-700)', 
              padding: 'var(--space-4)', 
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-6)',
              border: '1px solid var(--success-200)'
            }}>
              We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
            </div>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ width: '100%', display: 'block', textAlign: 'center', boxSizing: 'border-box' }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="reset-email">Email</label>
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
                  id="reset-email"
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

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner">
                    <div className="spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                  </div>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}

        {!success && (
          <div className="auth-footer" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
