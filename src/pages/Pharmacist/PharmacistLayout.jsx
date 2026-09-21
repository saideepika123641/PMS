import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserProfileMenu from '../../components/UserProfileMenu'
import PharmacistSidebar from './PharmacistSidebar'
import { pharmacistNavigation } from './pharmacistNavigation'
import '../Admin/AdminSidebar.css'
import '../Admin/AdminTopbar.css'
import '../Admin/admin.css'
import './PharmacistTopbar.css'
import './pharmacist.css'

function Icon({ children }) {
  return <svg className="branch-admin-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>
}

function PharmacistLayout({ activeLabel, title, subtitle, headerAction, children }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)

  const results = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return pharmacistNavigation
    return pharmacistNavigation.filter((item) => item.label.toLowerCase().includes(value))
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

  function handleMenuToggle() {
    if (window.innerWidth <= 1024) {
      setOpen(!open)
    } else {
      const shell = document.querySelector('.pharmacist-page') || document.querySelector('.branch-admin-page')
      if (shell) shell.classList.toggle('sidebar-collapsed')
    }
  }

  return (
    <div className={`branch-admin-page pharmacist-page${open ? ' branch-admin-sidebar-open' : ''}`}>
      <PharmacistSidebar activeLabel={activeLabel} />

      <main className="branch-admin-main pharmacist-main">
        <header className="branch-admin-header pharmacist-header">
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
              placeholder="Search dashboard, pending, dispensing, reports..."
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
            <button className="branch-admin-notification" type="button" aria-label="Notifications" title="Notifications" onClick={() => navigate('/pharmacist/dashboard')}>
              <Icon><path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9" /><path d="M10 21h4" /></Icon>
              <b className="unread-dot" />
            </button>
            <UserProfileMenu roleType="pharmacist" />
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

        <div className={`branch-admin-content pharmacist-content${activeLabel === 'Dashboard' ? ' is-dashboard' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default PharmacistLayout

