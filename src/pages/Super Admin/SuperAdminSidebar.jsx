import { useLocation, useNavigate } from 'react-router-dom'
import { superAdminNavigation } from '../../components/superAdminNavigation'
import './SuperAdminSidebar.css'

function readStoredUser() {
  const value = sessionStorage.getItem('superAdminUser') || localStorage.getItem('superAdminUser')
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return { email: value }
  }
}

function initials(value) {
  const text = String(value || '').trim()
  if (!text) return 'SA'
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function SuperAdminSidebar({ activeLabel = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = readStoredUser()
  const name = user?.name || user?.fullName || user?.email || 'Super Admin'

  return (
    <aside className="super-admin-sidebar" aria-label="Super admin navigation">
      <div className="super-admin-brand">
        <span className="super-admin-brand-mark">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </span>
        <div className="super-admin-brand-copy">
          <strong>PMS</strong>
          <small>Admin Console</small>
        </div>
      </div>

      <nav className="super-admin-nav">
        {superAdminNavigation.map(({ label, path, icon, color }) => {
          const isActive = location.pathname === path || label === activeLabel
          return (
            <button
              type="button"
              className={`super-admin-nav-link nav-color-${color || 'blue'}${isActive ? ' is-active' : ''}`}
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

      <div className="super-admin-sidebar-bottom">
        <button
          type="button"
          className="super-admin-collapse-btn"
          onClick={() => {
            const shell = document.querySelector('.super-admin-shell')
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

export default SuperAdminSidebar


