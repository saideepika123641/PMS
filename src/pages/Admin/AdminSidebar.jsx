import { useLocation, useNavigate } from 'react-router-dom'
import { adminNavigation } from './adminNavigation'
import './AdminSidebar.css'

function AdminSidebar({ activeLabel, hospitalName = 'Hospital', branchName = 'Branch', adminName = 'Pilla Durga Prasad' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const initials = adminName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PD'

  return (
    <aside className="branch-admin-sidebar" aria-label="Admin navigation">
      {/* Hospital Logo Header */}
      <div className="branch-admin-brand" onClick={() => navigate('/admin/dashboard')} role="button" tabIndex={0}>
        <b className="hospital-cross-badge">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </b>
        <div className="hospital-brand-info">
          <strong>{hospitalName}</strong>
          <small>{branchName}</small>
        </div>
      </div>

      {/* Main Navigation */}
      <nav>
        {adminNavigation.map(({ label, path, icon, color }) => {
          const isActive = activeLabel === label || location.pathname === path
          return (
            <button
              type="button"
              className={isActive ? 'active' : ''}
              style={{ '--accent-color': color }}
              onClick={() => navigate(path)}
              key={label}
            >
              <span className="sidebar-icon-wrap" style={{ color: color }}>
                {icon}
              </span>
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* User Profile Card at Bottom */}
      <div className="branch-admin-sidebar-footer" onClick={() => navigate('/admin/profile')} role="button" tabIndex={0} title="View Profile">
        <span className="sidebar-avatar-circle">{initials}</span>
        <div className="sidebar-profile-info">
          <strong>{adminName}</strong>
          <small>{branchName}</small>
          <em className="online-indicator">
            <i className="pulse-dot" />
            Online
          </em>
        </div>
      </div>
    </aside>
  )
}

export default AdminSidebar
