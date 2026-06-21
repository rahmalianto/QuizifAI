import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Sparkles, FolderOpen, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
              to="/generate"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              id="nav-generate"
            >
              <Sparkles size={18} />
              <span>Generate</span>
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
