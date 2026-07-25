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
            <button 
              className="btn-avatar" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              id="btn-profile-dropdown"
              title="User Profile"
            >
              <div className="avatar">{getInitials(user?.email)}</div>
            </button>

            {dropdownOpen && (
              <div 
                className="dropdown-menu-custom" 
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '8px',
                  background: 'var(--neutral-0)',
                  border: 'var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  minWidth: '200px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 0'
                }}
              >
                <div style={{ padding: '8px 16px', borderBottom: 'var(--border-light)', marginBottom: '4px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>Signed in as</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-800)', wordBreak: 'break-all' }}>
                    {user?.email}
                  </div>
                </div>

                <Link
                  to="/settings"
                  className="dropdown-item-custom"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    color: 'var(--neutral-700)',
                    fontSize: 'var(--text-sm)',
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleSignOut();
                  }}
                  className="dropdown-item-custom"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    color: 'var(--danger-600)',
                    fontSize: 'var(--text-sm)',
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
