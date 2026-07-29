import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { FolderOpen, LogOut, Dices, Tag, HelpCircle, BookOpen, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <div className="profile-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Avatar trigger button */}
            <button
              className={`btn-avatar-ring${dropdownOpen ? ' active' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              id="btn-profile-dropdown"
              title="User Profile"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <div className="avatar-inner">{getInitials(user?.email)}</div>
              <span className="avatar-online-dot" />
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="profile-dropdown-panel">
                {/* User info header */}
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-avatar">{getInitials(user?.email)}</div>
                  <div className="profile-dropdown-info">
                    <div className="profile-dropdown-label">Signed in as</div>
                    <div className="profile-dropdown-email">{user?.email}</div>
                  </div>
                </div>

                <div className="profile-dropdown-divider" />

                <div className="profile-dropdown-body">
                  <Link
                    to="/settings"
                    className="profile-dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="profile-dropdown-item-icon"><Settings size={15} /></span>
                    <span>Settings</span>
                  </Link>

                  <button
                    onClick={() => { setDropdownOpen(false); handleSignOut(); }}
                    className="profile-dropdown-item profile-dropdown-item--danger"
                  >
                    <span className="profile-dropdown-item-icon"><LogOut size={15} /></span>
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
