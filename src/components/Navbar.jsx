import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Sparkles, FolderOpen, LogOut, Dices, Tag, HelpCircle, BookOpen, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success('Signed out successfully');
    } catch (err) {
      toast.error('Failed to sign out');
    }
  };

  const getInitials = (email) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="container">
        <NavLink to="/" className="navbar-brand">
          <div className="logo">Q</div>
          <span>QuizifAI</span>
        </NavLink>

        <ul className="navbar-nav">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              id="nav-dashboard"
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              id="nav-categories"
            >
              <FolderOpen size={18} />
              <span>Categories</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/tags"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              id="nav-tags"
            >
              <Tag size={18} />
              <span>Tags</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/questions"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              id="nav-questions"
            >
              <HelpCircle size={18} />
              <span>Questions</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/practice"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              id="nav-practice"
            >
              <Dices size={18} />
              <span>Practice</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/knowledge-base"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              id="nav-knowledge-base"
            >
              <BookOpen size={18} />
              <span>Knowledge Base</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/chat"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              id="nav-chat"
            >
              <MessageSquare size={18} />
              <span>Chat</span>
            </NavLink>
          </li>
        </ul>

        <div className="navbar-actions">
          <div className="navbar-user">
            <div className="avatar">{getInitials(user?.email)}</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleSignOut}
            id="btn-sign-out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
