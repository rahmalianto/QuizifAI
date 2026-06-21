import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  FolderOpen,
  Sparkles,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalCategories: 0,
    recentQuestions: 0,
  });
  const [categories, setCategories] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch categories with question counts
        const { data: cats } = await supabase
          .from('categories')
          .select('*, questions(count)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const categoriesData = (cats || []).map((cat) => ({
          ...cat,
          question_count: cat.questions?.[0]?.count || 0,
        }));

        // Fetch total question count
        const { count: totalQuestions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Fetch questions created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: recentQuestions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString());

        // Fetch recent questions for activity feed
        const { data: recent } = await supabase
          .from('questions')
          .select('id, question_text, answer_type, created_at, categories(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setCategories(categoriesData);
        setStats({
          totalQuestions: totalQuestions || 0,
          totalCategories: categoriesData.length,
          recentQuestions: recentQuestions || 0,
        });
        setRecentActivity(recent || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container">
          {/* Page Header */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 id="dashboard-title">{greeting()} 👋</h1>
              <p>Here&apos;s an overview of your quiz content</p>
            </div>
            <Link to="/generate" className="btn btn-primary btn-lg" id="btn-quick-generate">
              <Sparkles size={18} />
              Generate Questions
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6" style={{ marginBottom: 'var(--space-10)' }}>
            <div className="stat-card animate-in stagger-1">
              <div className="stat-icon purple">
                <HelpCircle size={22} />
              </div>
              <div className="stat-content">
                <h4>{loading ? '—' : stats.totalQuestions.toLocaleString()}</h4>
                <p>Total Questions</p>
              </div>
            </div>

            <div className="stat-card animate-in stagger-2">
              <div className="stat-icon green">
                <FolderOpen size={22} />
              </div>
              <div className="stat-content">
                <h4>{loading ? '—' : stats.totalCategories}</h4>
                <p>Categories</p>
              </div>
            </div>

            <div className="stat-card animate-in stagger-3">
              <div className="stat-icon blue">
                <Sparkles size={22} />
              </div>
              <div className="stat-content">
                <h4>{loading ? '—' : stats.recentQuestions}</h4>
                <p>Generated Today</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
            {/* Categories Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                <h3>Your Categories</h3>
                <Link to="/categories" className="btn btn-ghost btn-sm" id="link-all-categories">
                  View all <ArrowRight size={14} />
                </Link>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: '64px' }}></div>
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No categories yet"
                  description="Create your first category to start organizing questions."
                  action={
                    <Link to="/categories" className="btn btn-primary">
                      <Plus size={16} /> Create Category
                    </Link>
                  }
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {categories.slice(0, 5).map((cat, i) => (
                    <Link
                      key={cat.id}
                      to={`/categories/${cat.id}`}
                      className={`card card-interactive animate-in stagger-${Math.min(i + 1, 6)}`}
                      style={{ padding: 'var(--space-4) var(--space-5)', textDecoration: 'none', color: 'inherit' }}
                      id={`dashboard-category-${cat.id}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--primary-50)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--primary-500)',
                            }}
                          >
                            <FolderOpen size={16} />
                          </div>
                          <div>
                            <h5 style={{ fontSize: 'var(--text-sm)' }}>{cat.name}</h5>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                              {cat.question_count} questions
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={16} style={{ color: 'var(--neutral-400)' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Section */}
            <div>
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <h3>Recent Activity</h3>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: '56px' }}></div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No activity yet"
                  description="Generate your first set of questions to see activity here."
                  action={
                    <Link to="/generate" className="btn btn-primary">
                      <Sparkles size={16} /> Generate Questions
                    </Link>
                  }
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {recentActivity.map((item, i) => (
                    <div
                      key={item.id}
                      className={`card animate-in stagger-${Math.min(i + 1, 6)}`}
                      style={{ padding: 'var(--space-3) var(--space-4)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--info-50)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--info-500)',
                            flexShrink: 0,
                          }}
                        >
                          <HelpCircle size={14} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--neutral-700)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {item.question_text}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '2px' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                              {item.categories?.name || 'Uncategorized'}
                            </span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-300)' }}>•</span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
