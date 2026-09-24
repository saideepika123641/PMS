import { useLocation, useNavigate } from 'react-router-dom'
import { adminNavigation } from './adminNavigation'
import { hasPermission, readAdminPermissions } from '../../config/permissions'
import './AdminSidebar.css'

function AdminSidebar({ activeLabel, hospitalName = 'PMS', branchName = 'Admin Console', adminName = 'Admin' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const permissions = readAdminPermissions()
  const visibleNavigation = adminNavigation.filter((item) => item.label === 'Dashboard' || hasPermission(permissions, item.label, 'view'))

  return (
    <aside className="branch-admin-sidebar" aria-label="Admin navigation">
      {/* Brand Header */}
      <div className="branch-admin-brand" onClick={() => navigate('/admin/dashboard')} role="button" tabIndex={0}>
        <span className="branch-admin-brand-mark">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </span>
        <div className="branch-admin-brand-copy">
          <strong>PMS</strong>
          <small>{branchName || 'Admin Console'}</small>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="branch-admin-nav">
        {visibleNavigation.map(({ label, path, icon, color }) => {
          const isActive = activeLabel === label || location.pathname === path
          return (
            <button
              type="button"
              className={`branch-admin-nav-link nav-color-${color || 'blue'}${isActive ? ' is-active' : ''}`}
              onClick={() => navigate(path)}
              key={label}
            >
              <span className={`nav-icon-badge badge-${color || 'blue'}`}>
                {icon}
              </span>
              <span className="nav-label">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Collapse Menu Button at Bottom */}
      <div className="branch-admin-sidebar-bottom">
        <button
          type="button"
          className="branch-admin-collapse-btn"
          onClick={() => {
            const shell = document.querySelector('.branch-admin-page')
            if (shell) shell.classList.toggle('sidebar-collapsed')
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Collapse Menu</span>
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar
