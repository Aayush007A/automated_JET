import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../../services/authService';
import { LogOut, ShieldCheck, User, ChevronLeft, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = AuthService.getCurrentUser();

  const isWorkflowPage = location.pathname.includes('/spark-jet') || location.pathname.includes('/omnia-jet');
  const isDashboard = location.pathname === '/dashboard';

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 28px',
      boxShadow: '0 1px 12px rgba(15, 23, 42, 0.05)',
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        {/* Left: Brand + Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Back to Dashboard — shown only on workflow pages */}
          {isWorkflowPage && (
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: 'var(--deloitte-teal-light)',
                border: '1px solid rgba(0, 118, 128, 0.25)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--deloitte-teal)',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#007680';
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 118, 128, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--deloitte-teal-light)';
                e.currentTarget.style.color = 'var(--deloitte-teal)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <ChevronLeft size={15} />
              Home
            </button>
          )}

          {/* Brand */}
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #007680 0%, #005A62 60%, #86BC25 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 118, 128, 0.3)',
              flexShrink: 0,
            }}>
              <ShieldCheck size={22} color="#FFFFFF" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.22rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
                  Deloitte<span style={{ color: 'var(--deloitte-green)' }}>.</span>
                </span>
                <span style={{
                  background: 'var(--deloitte-teal)',
                  color: '#FFFFFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '5px',
                  letterSpacing: '0.06em',
                  boxShadow: '0 2px 6px rgba(0, 118, 128, 0.25)',
                }}>
                  JET PLATFORM
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                Journal Entry Testing & Analytics
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Workflow Context Breadcrumb */}
        {isWorkflowPage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            background: 'var(--bg-secondary)',
            borderRadius: '999px',
            border: '1px solid var(--border-subtle)',
          }}>
            <LayoutDashboard size={13} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Dashboard</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--deloitte-teal)', fontWeight: 700 }}>
              {location.pathname.includes('/spark-jet') ? 'Spark JET' : 'Omnia JET'}
            </span>
          </div>
        )}

        {/* Right: User Info + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: '#FAFBFC',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--deloitte-teal-light), rgba(134, 188, 37, 0.15))',
                border: '1.5px solid rgba(0, 118, 128, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--deloitte-teal)',
                flexShrink: 0,
              }}>
                <User size={15} />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user.fullName || user.username}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Role: <span style={{ color: 'var(--deloitte-teal)', fontWeight: 700, textTransform: 'capitalize' }}>{user.role}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#FFFFFF',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--status-error)';
              e.currentTarget.style.color = 'var(--status-error)';
              e.currentTarget.style.background = '#FFF1F2';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-medium)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = '#FFFFFF';
            }}
            title="Sign out"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
