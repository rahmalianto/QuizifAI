import { Link } from 'react-router-dom';
import { Sparkles, Brain, Target, ArrowRight, Zap, CheckCircle2, FileText, BarChart3, Database } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function LandingPage() {
  const { user } = useAuth();

  // If user is already authenticated, send them to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-page">
      {/* Navbar for Landing Page */}
      <nav className="landing-nav">
        <div className="container landing-nav-inner">
          <div className="landing-brand">
            <div className="logo logo-large">Q</div>
            <span className="brand-text">QuizifAI</span>
          </div>
          <div className="landing-nav-actions">
            <Link to="/login" className="btn btn-text">Log in</Link>
            <Link to="/register" className="btn btn-primary">Sign up free</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-bg-elements">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
        
        <div className="container hero-container">
          <div className="hero-badge animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <Sparkles size={16} />
            <span>The Future of Learning</span>
          </div>
          
          <h1 className="hero-title animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Turn Any Material Into <br className="hero-title-break" />
            <span className="text-gradient">Interactive Quizzes</span>
          </h1>
          
          <p className="hero-subtitle animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            QuizifAI uses advanced AI to instantly generate high-quality questions from your documents, notes, and study materials. Practice smarter, not harder.
          </p>
          
          <div className="hero-actions animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/register" className="btn btn-primary btn-lg hero-btn">
              Get Started for Free <ArrowRight size={20} />
            </Link>
          </div>
          
          <div className="hero-stats animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="stat-item">
              <CheckCircle2 size={20} className="text-success-500" />
              <span>No credit card required</span>
            </div>
            <div className="stat-item">
              <CheckCircle2 size={20} className="text-success-500" />
              <span>Instant AI generation</span>
            </div>
          </div>
        </div>
      </header>

      {/* How it Works Section */}
      <section className="section how-it-works">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">How it works</h2>
            <p className="section-subtitle">Three simple steps to supercharge your study sessions.</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card glass-card">
              <div className="step-icon-wrapper">
                <FileText size={32} className="text-primary-500" />
              </div>
              <h3>1. Upload Material</h3>
              <p>Paste text, upload PDFs, or Word documents. We handle the formatting and extraction automatically.</p>
            </div>
            
            <div className="step-card glass-card">
              <div className="step-icon-wrapper">
                <Brain size={32} className="text-purple-500" />
              </div>
              <h3>2. AI Generates</h3>
              <p>Our advanced models analyze the context and generate relevant multiple-choice or short-answer questions.</p>
            </div>
            
            <div className="step-card glass-card">
              <div className="step-icon-wrapper">
                <Target size={32} className="text-success-500" />
              </div>
              <h3>3. Practice & Learn</h3>
              <p>Take interactive quizzes, review AI-generated explanations, and track your knowledge score over time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section features bg-neutral-50">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Everything you need to succeed</h2>
          </div>
          
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon bg-primary-100 text-primary-600">
                <Zap size={24} />
              </div>
              <h4>Lightning Fast</h4>
              <p>Generate dozens of questions in seconds. No more manual flashcard creation.</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon bg-purple-100 text-purple-600">
                <Database size={24} />
              </div>
              <h4>Knowledge Base</h4>
              <p>Organize your questions into categories and tags. Search and filter with ease.</p>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon bg-success-100 text-success-600">
                <BarChart3 size={24} />
              </div>
              <h4>Detailed Analytics</h4>
              <p>Monitor your progress, see your weak spots, and improve your average score.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section cta-section">
        <div className="container cta-container glass-card">
          <h2>Ready to transform your study habits?</h2>
          <p>Join thousands of students and professionals learning faster with QuizifAI.</p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container text-center">
          <div className="landing-brand justify-center mb-4">
            <div className="logo">Q</div>
            <span className="brand-text">QuizifAI</span>
          </div>
          <p className="text-neutral-500">© {new Date().getFullYear()} QuizifAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
