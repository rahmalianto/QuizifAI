import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  FolderOpen,
  Sparkles,
  Clock,
  ArrowRight,
  Plus,
  BarChart2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useQuestions } from '../hooks/useQuestions';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import EditQuestionModal from '../components/EditQuestionModal';
import AnalyticsChart from '../components/AnalyticsChart';

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
  const [editingQuestion, setEditingQuestion] = useState(null);
  const { updateQuestion, deleteQuestion, saving, generateExplanation } = useQuestions();

  // Analytics state
  const [dailyChart, setDailyChart] = useState([]);
  const [worstCategories, setWorstCategories] = useState([]);
  const [worstTags, setWorstTags] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch categories with question counts
        const { data: cats } = await supabase
          .from('categories')
          .select('*, questions(count)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .is('questions.deleted_at', null)
          .order('created_at', { ascending: false });

        const categoriesData = (cats || []).map((cat) => ({
          ...cat,
          question_count: cat.questions?.[0]?.count || 0,
        }));

        // Fetch total question count
        const { count: totalQuestions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null);

        // Fetch questions created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: recentQuestions } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .gte('created_at', today.toISOString());

        // Fetch recent questions for activity feed
        const { data: recent } = await supabase
          .from('questions')
          .select('*, question_tags(tags(name, deleted_at)), categories(name)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5);

        const normalizedRecent = (recent || []).map((q) => ({
          ...q,
          correct_answers:
            typeof q.correct_answers === 'string'
              ? JSON.parse(q.correct_answers)
              : q.correct_answers || [],
          incorrect_options:
            typeof q.incorrect_options === 'string'
              ? JSON.parse(q.incorrect_options)
              : q.incorrect_options || [],
          tags: (q.question_tags || [])
            .filter((qt) => !qt.tags?.deleted_at)
            .map((qt) => qt.tags?.name)
            .filter(Boolean),
          category_name: q.categories?.name,
        }));

        setCategories(categoriesData);
        setStats({
          totalQuestions: totalQuestions || 0,
          totalCategories: categoriesData.length,
          recentQuestions: recentQuestions || 0,
        });
        setRecentActivity(normalizedRecent);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAnalytics = async () => {
      try {
        // --- 1. Daily practice: sessions count + avg score per day (last 30 days) ---
        const since = new Date();
        since.setDate(since.getDate() - 29);
        since.setHours(0, 0, 0, 0);

        const { data: activityRows } = await supabase
          .from('practice_activity')
          .select('answered_at, correctness_score')
          .eq('user_id', user.id)
          .gte('answered_at', since.toISOString())
          .order('answered_at', { ascending: true });

        // Group by UTC date
        const dayMap = {};
        for (const row of activityRows || []) {
          const day = row.answered_at.slice(0, 10); // 'YYYY-MM-DD'
          if (!dayMap[day]) dayMap[day] = { count: 0, scoreSum: 0 };
          dayMap[day].count += 1;
          dayMap[day].scoreSum += Number(row.correctness_score) * 100;
        }
        // Fill every day in range so chart has no gaps
        const chartData = [];
        for (let i = 0; i < 30; i++) {
          const d = new Date(since);
          d.setDate(d.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          const entry = dayMap[key];
          chartData.push({
            date: key,
            practice_count: entry ? entry.count : 0,
            avg_score: entry ? Math.round(entry.scoreSum / entry.count) : null,
          });
        }
        setDailyChart(chartData);

        // --- 2. Worst 5 categories ---
        const { data: catScores } = await supabase.rpc('get_category_knowledge_scores', {
          p_user_id: user.id,
        });
        // Fetch category names
        const { data: allCats } = await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', user.id)
          .is('deleted_at', null);
        const catNameMap = Object.fromEntries((allCats || []).map(c => [c.id, c.name]));
        const worstCats = (catScores || [])
          .filter(c => c.practiced_count > 0)
          .sort((a, b) => Number(a.avg_score) - Number(b.avg_score))
          .slice(0, 5)
          .map(c => ({
            id: c.category_id,
            name: catNameMap[c.category_id] || 'Unknown',
            avg_score: Number(c.avg_score),
            practiced_count: Number(c.practiced_count),
            total_count: Number(c.total_count),
          }));
        setWorstCategories(worstCats);

        // --- 3. Worst 5 tags ---
        const { data: tagScores } = await supabase.rpc('get_tag_knowledge_scores', {
          p_user_id: user.id,
        });
        const worstTagsData = (tagScores || [])
          .filter(t => t.practiced_count > 0)
          .sort((a, b) => Number(a.avg_score) - Number(b.avg_score))
          .slice(0, 5)
          .map(t => ({
            name: t.tag_name,
            avg_score: Number(t.avg_score),
            practiced_count: Number(t.practiced_count),
            total_count: Number(t.total_count),
          }));
        setWorstTags(worstTagsData);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchDashboardData();
    fetchAnalytics();
  }, [user]);

  const handleSaveEdit = async (updates) => {
    try {
      await updateQuestion(editingQuestion.id, updates);
      setEditingQuestion(null);
      // Update local state instead of refetching the whole dashboard
      setRecentActivity((prev) => 
        prev.map(q => q.id === editingQuestion.id ? { ...q, ...updates } : q)
      );
    } catch (err) {
      console.error(err);
    }
  };

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

          {/* ── Analytics Section ── */}
          <div className="analytics-section" style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <BarChart2 size={22} style={{ color: 'var(--primary-500)' }} />
              <h2 className="analytics-section-title">Performance Analytics</h2>
            </div>

            {/* Daily chart */}
            <div className="analytics-chart-card">
              <div className="analytics-chart-header">
                <h3>Daily Practice &amp; Score — Last 30 Days</h3>
                <div className="analytics-legend">
                  <div className="analytics-legend-item">
                    <span className="analytics-legend-dot" style={{ background: '#0EA5E9' }} />
                    Sessions
                  </div>
                  <div className="analytics-legend-item">
                    <span className="analytics-legend-dot" style={{ background: '#7C5CFC' }} />
                    Avg Score %
                  </div>
                </div>
              </div>
              {analyticsLoading ? (
                <div className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />
              ) : (
                <AnalyticsChart data={dailyChart} />
              )}
            </div>

            {/* Tables row */}
            <div className="analytics-tables-grid">
              {/* Worst 5 by Category */}
              <div className="analytics-table-card">
                <h3>⚠️ Worst 5 by Category</h3>
                {analyticsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '40px' }} />)}
                  </div>
                ) : worstCategories.length === 0 ? (
                  <div className="analytics-table-empty">No practiced categories yet.</div>
                ) : (
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Category</th>
                        <th>Practiced</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worstCategories.map((cat, i) => (
                        <tr key={cat.id}>
                          <td className="analytics-rank">{i + 1}</td>
                          <td>
                            <Link
                              to={`/categories/${cat.id}`}
                              className="analytics-name"
                              style={{ color: 'var(--neutral-800)', textDecoration: 'none' }}
                              title={cat.name}
                            >
                              {cat.name}
                            </Link>
                          </td>
                          <td className="analytics-count">{cat.practiced_count}/{cat.total_count}</td>
                          <td><ScoreCell score={cat.avg_score} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Worst 5 by Tag */}
              <div className="analytics-table-card">
                <h3>⚠️ Worst 5 by Tag</h3>
                {analyticsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '40px' }} />)}
                  </div>
                ) : worstTags.length === 0 ? (
                  <div className="analytics-table-empty">No practiced tags yet.</div>
                ) : (
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tag</th>
                        <th>Practiced</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worstTags.map((tag, i) => (
                        <tr key={tag.name}>
                          <td className="analytics-rank">{i + 1}</td>
                          <td><span className="analytics-name" title={tag.name}>{tag.name}</span></td>
                          <td className="analytics-count">{tag.practiced_count}/{tag.total_count}</td>
                          <td><ScoreCell score={tag.avg_score} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-content-grid" style={{ marginTop: 'var(--space-10)' }}>
            {/* Categories Section */}
            <div style={{ minWidth: 0 }}>
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
                          <div style={{ minWidth: 0 }}>
                            <h5 style={{ fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</h5>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                              {cat.question_count} questions
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={16} style={{ color: 'var(--neutral-400)', flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Section */}
            <div style={{ minWidth: 0 }}>
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
                      className={`card card-interactive animate-in stagger-${Math.min(i + 1, 6)}`}
                      style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer' }}
                      onClick={() => setEditingQuestion(item)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            minWidth: '32px',
                            minHeight: '32px',
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


      {/* Edit Modal */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          saving={saving}
          onSave={handleSaveEdit}
          onClose={() => setEditingQuestion(null)}
          onDelete={async (questionId) => {
            try {
              await deleteQuestion(questionId);
              setRecentActivity((prev) => prev.filter((q) => q.id !== questionId));
            } catch (err) {
              console.error(err);
              throw err;
            }
          }}
          generateExplanation={generateExplanation}
        />
      )}
    </>
  );
}

/* ---- ScoreCell helper ---- */
function ScoreCell({ score }) {
  if (score == null) return <span style={{ color: 'var(--neutral-300)', fontSize: 'var(--text-xs)' }}>—</span>;

  const cls = score < 50 ? 'score-bad' : score < 75 ? 'score-mid' : 'score-ok';
  const barColor = score < 50 ? 'var(--danger-500)' : score < 75 ? 'var(--warning-500)' : 'var(--info-500)';

  return (
    <div className="analytics-score-bar-wrap">
      <div className="analytics-score-bar">
        <div
          className="analytics-score-bar-fill"
          style={{ width: `${score}%`, background: barColor }}
        />
      </div>
      <span className={`analytics-score-badge ${cls}`}>{score}%</span>
    </div>
  );
}
