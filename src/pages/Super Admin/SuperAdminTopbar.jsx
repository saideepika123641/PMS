import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserProfileMenu from '../../components/UserProfileMenu'
import { superAdminNavigation } from '../../components/superAdminNavigation'
import { listSuperAdminNotifications } from '../../config/api'
import './SuperAdminTopbar.css'

function Icon({ children }) {
  return <svg className="super-admin-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>
}

function listFrom(response) {
  if (Array.isArray(response)) return response
  return ['data', 'items', 'results', 'notifications', 'records'].reduce(
    (list, key) => list.length ? list : (Array.isArray(response?.[key]) ? response[key] : []),
    []
  )
}

function SuperAdminTopbar({ onMenu, placeholder = 'Search dashboard, pharmacies, admins, reports...' }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let active = true

    function syncCount() {
      listSuperAdminNotifications()
        .then((response) => {
          if (!active) return
          const items = listFrom(response)
          const count = items.filter((item) => {
            const state = String(
              item?.status || item?.state || (item?.read || item?.isRead ? 'read' : 'unread')
            ).toLowerCase()
            return state === 'unread'
          }).length
          setUnreadCount(count)
        })
        .catch(() => {
          if (active) setUnreadCount(0)
        })
    }

    syncCount()

    function handleNotificationEvent(event) {
      if (typeof event?.detail?.unreadCount === 'number') {
        setUnreadCount(event.detail.unreadCount)
      } else {
        syncCount()
      }
    }

    window.addEventListener('pms:notifications-updated', handleNotificationEvent)
    return () => {
      active = false
      window.removeEventListener('pms:notifications-updated', handleNotificationEvent)
    }
  }, [])

  const results = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return superAdminNavigation
    return superAdminNavigation.filter((item) => item.label.toLowerCase().includes(value))
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
    <header className="super-admin-topbar">
      <button className="super-admin-topbar-menu" onClick={onMenu} type="button" aria-label="Open sidebar">
        <Icon><path d="M4 6h16M4 12h16M4 18h16" /></Icon>
      </button>

      <form
        className="super-admin-topbar-search"
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
          placeholder={placeholder}
        />
        {showResults ? (
          <div className="super-admin-topbar-results">
            {results.length ? results.slice(0, 7).map((item) => (
              <button
                type="button"
                key={item.path}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => goTo(item.path)}
              >
                {item.label}
              </button>
            )) : <span>No matching module</span>}
          </div>
        ) : null}
      </form>

      <div className="super-admin-topbar-right">
        <button className="super-admin-topbar-notification" type="button" aria-label="Notifications" onClick={() => navigate('/super-admin/notifications')}>
          <Icon><path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9" /><path d="M10 21h4" /></Icon>
          {unreadCount > 0 ? <b>{unreadCount > 99 ? '99+' : unreadCount}</b> : null}
        </button>
        <UserProfileMenu roleType="super-admin" />
      </div>
    </header>
  )
}

export default SuperAdminTopbar



