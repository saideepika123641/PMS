import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserProfileMenu from '../../components/UserProfileMenu'
import AdminSidebar from './AdminSidebar'
import { adminNavigation } from './adminNavigation'
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

function AdminLayout({ activeLabel, title, subtitle, children }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const user = readStoredValue('pharmacyAdminUser') || {}
  const assignment = readStoredValue('pharmacyAdminAssignment') || {}
  const adminName = user?.name || user?.fullName || user?.email || 'Pilla Durga Prasad'
  const hospitalName = assignment?.hospitalName || assignment?.hospital?.name || assignment?.clinicName || assignment?.clinic?.name || 'Hospital'
  const branchName = assignment?.branchName || assignment?.branch?.name || assignment?.pharmacyName || assignment?.pharmacy?.name || 'Branch'
  
  const results = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return adminNavigation
    return adminNavigation.filter((item) => item.label.toLowerCase().includes(value))
  }, [query])

  function goTo(path) {
    setQuery('')
    setShowResults(false)
    navigate(path)
  }

  function submitSearch(event) {
    event.preventDefault()
    if (results[0]) goTo(results[0].path)
  }

  return (
    <div className={`branch-admin-page${open ? ' branch-admin-sidebar-open' : ''}`}>
      <AdminSidebar activeLabel={activeLabel} hospitalName={hospitalName} branchName={branchName} adminName={adminName} />

      <main className="branch-admin-main">
        <header className="branch-admin-header">
          <button className="branch-admin-menu" type="button" onClick={() => setOpen(!open)}>
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
              placeholder="Search dashboard, medicines, users, reports..."
            />
            <span className="search-shortcut-badge">⌘ K</span>
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
            <button className="branch-admin-notification" type="button" aria-label="Notifications" title="Notifications">
              <Icon><path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2-2-9" /><path d="M10 21h4" /></Icon>
              <b className="unread-dot" />
            </button>
            <UserProfileMenu roleType="pharmacy-admin" />
          </div>
        </header>

        <div className={`branch-admin-content${activeLabel === 'Dashboard' ? ' is-dashboard' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
