import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserProfileMenu from '../../components/UserProfileMenu'
import AdminSidebar from './AdminSidebar'
import { adminNavigation } from './adminNavigation'
import { hasPermission, readAdminPermissions } from '../../config/permissions'
import './AdminTopbar.css'
import './admin.css'

function Icon({ children }) {
  return <svg className="branch-admin-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>
}

function readStoredValue(key) {
  const value = sessionStorage.getItem(key) || localStorage.getItem(key)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function AdminLayout({ activeLabel, title, subtitle, headerAction, children }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const user = readStoredValue('pharmacyAdminUser') || {}
  const assignment = readStoredValue('pharmacyAdminAssignment') || {}
  const adminName = user?.name || user?.fullName || user?.email || 'Admin'
  const hospitalName = assignment?.hospitalName || assignment?.hospital?.name || assignment?.clinicName || assignment?.clinic?.name || 'PMS'
  const branchName = assignment?.branchName || assignment?.branch?.name || assignment?.pharmacyName || assignment?.pharmacy?.name || 'Admin Console'
  const permissions = readAdminPermissions()
  const visibleNavigation = useMemo(() => adminNavigation.filter((item) => item.label === 'Dashboard' || hasPermission(permissions, item.label, 'view')), [permissions])
  
  const results = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return visibleNavigation
    return visibleNavigation.filter((item) => item.label.toLowerCase().includes(value))
  }, [query, visibleNavigation])

  function goTo(path) {
    setQuery('')
    setShowResults(false)
    navigate(path)
  }

  function submitSearch(event) {
    event.preventDefault()
    if (results[0]) goTo(results[0].path)
  }

  function handleMenuToggle() {
    if (window.innerWidth <= 1024) {
      setOpen(!open)
    } else {
      const shell = document.querySelector('.branch-admin-page')
      if (shell) shell.classList.toggle('sidebar-collapsed')
    }
  }

  return (
    <div className={`branch-admin-page${open ? ' branch-admin-sidebar-open' : ''}`}>
      <AdminSidebar activeLabel={activeLabel} hospitalName={hospitalName} branchName={branchName} adminName={adminName} />

      <main className="branch-admin-main">
        <header className="branch-admin-header">
          <button className="branch-admin-menu" type="button" onClick={handleMenuToggle} aria-label="Toggle sidebar">
            <Icon><path d="M4 6h16M4 12h16M4 18h16" /></Icon>
          </button>
          
          <form
            className="branch-admin-top-search"
            onSubmit={submitSearch}
            onBlur={() => window.setTimeout(() => setShowResults(false), 120)}
          >
            <Icon><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></Icon>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search dashboard, medicines, pharmacists, reports..."
            />
            {showResults ? (
              <div className="branch-admin-search-results">
                {results.length ? results.slice(0, 7).map((item) => (
                  <button type="button" key={item.path} onMouseDown={(event) => event.preventDefault()} onClick={() => goTo(item.path)}>
                    {item.label}
                  </button>
                )) : <span>No matching module</span>}
              </div>
            ) : null}
          </form>

          <div className="header-right-actions">
            <button className="branch-admin-notification" type="button" aria-label="Notifications" title="Notifications" onClick={() => navigate('/admin/expiry-alerts')}>
              <Icon><path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9" /><path d="M10 21h4" /></Icon>
              <b className="unread-dot" />
            </button>
            <UserProfileMenu roleType="pharmacy-admin" />
          </div>
        </header>

        {title && activeLabel !== 'Dashboard' ? (
          <section className="reference-heading-card admin-heading-card">
            <div className="reference-heading-accent" />
            <div className="admin-heading-text-wrap">
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            {headerAction ? <div className="admin-heading-action">{headerAction}</div> : null}
          </section>
        ) : null}

        <div className={`branch-admin-content${activeLabel === 'Dashboard' ? ' is-dashboard' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default AdminLayout

