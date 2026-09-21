import { useEffect, useMemo, useState } from 'react'
import { deleteSuperAdminNotification, listSuperAdminNotifications, markAllSuperAdminNotificationsRead, markSuperAdminNotificationRead, sendSuperAdminNotification } from '../../config/api'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import './Notifications.css'

const PAGE_SIZE = 10

function Icon({ children }) {
  return <svg className="notifications-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>
}

function listFrom(response) {
  if (Array.isArray(response)) return response
  return ['data', 'items', 'results', 'notifications', 'records'].reduce((list, key) => list.length ? list : (Array.isArray(response?.[key]) ? response[key] : []), [])
}

function readValue(item, names, fallback = '') {
  return names.reduce((value, name) => value || item?.[name], '') || fallback
}

function normalize(item, index) {
  const type = String(readValue(item, ['type', 'category', 'notificationType'], 'system')).toLowerCase()
  const state = String(readValue(item, ['status', 'state'], item?.read || item?.isRead ? 'read' : 'unread')).toLowerCase()
  return {
    id: readValue(item, ['_id', 'id', 'notificationId'], index),
    title: readValue(item, ['title', 'subject', 'name'], 'Pharmacy System Notification'),
    message: readValue(item, ['message', 'description', 'body', 'content'], ''),
    type,
    status: state === 'read' || state === 'sent' ? state : 'unread',
    createdAt: readValue(item, ['createdAt', 'created_at', 'date', 'timestamp'], ''),
  }
}

function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function notificationIcon(type) {
  if (type.includes('stock')) return <Icon><path d="M4 7h16v13H4zM7 7V4h10v3M8 11h8M8 15h5" /></Icon>
  if (type.includes('expir')) return <Icon><path d="M12 3v9l5 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></Icon>
  if (type.includes('order') || type.includes('purchase')) return <Icon><path d="M5 7h14l-1 13H6L5 7ZM8 7a4 4 0 0 1 8 0M9 11h6" /></Icon>
  if (type.includes('admin') || type.includes('user')) return <Icon><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0M19 5v5M16.5 7.5h5" /></Icon>
  return <Icon><path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9M10 21h4" /></Icon>
}

function Notifications() {
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', audience: 'all-admins' })

  async function loadNotifications() {
    setLoading(true)
    setError('')
    try {
      const response = await listSuperAdminNotifications()
      setItems(listFrom(response).map(normalize))
    } catch (requestError) {
      setError(requestError.message || 'Unable to load notifications.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadNotifications() }, [])

  const filteredItems = useMemo(() => items.filter((item) => tab === 'all' || item.status === tab), [items, tab])
  const visibleItems = filteredItems.slice(0, page * PAGE_SIZE)
  const unreadCount = items.filter((item) => item.status === 'unread').length

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pms:notifications-updated', { detail: { unreadCount } }))
  }, [unreadCount])

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function sendNotification(event) {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      await sendSuperAdminNotification(form)
      setModalOpen(false)
      setForm({ title: '', message: '', audience: 'all-admins' })
      await loadNotifications()
    } catch (requestError) {
      setError(requestError.message || 'Unable to send notification.')
    } finally {
      setSending(false)
    }
  }

  async function deleteNotification(id) {
    setError('')
    try {
      await deleteSuperAdminNotification(id)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete notification.')
    }
  }

  async function markRead(id) {
    setError('')
    try {
      await markSuperAdminNotificationRead(id)
      setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'read' } : item))
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark notification as read.')
    }
  }

  async function markAllRead() {
    setError('')
    try {
      await markAllSuperAdminNotificationsRead()
      setItems((current) => current.map((item) => item.status === 'unread' ? { ...item, status: 'read' } : item))
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark all notifications as read.')
    }
  }

  const tabIcons = {
    all: <Icon><path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9M10 21h4" /></Icon>,
    unread: <Icon><path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9M10 21h4" /></Icon>,
    read: <Icon><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></Icon>,
    sent: <Icon><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></Icon>,
  }
  const tabCounts = { all: items.length, unread: unreadCount, read: items.filter((item) => item.status === 'read').length, sent: items.filter((item) => item.status === 'sent').length }
  const tabs = [['all', 'All'], ['unread', 'Unread'], ['read', 'Read'], ['sent', 'Sent']]

  return <div className={`super-admin-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
    <SuperAdminSidebar activeLabel="Notifications" />
    <main className="super-admin-main notifications-page">
      <SuperAdminTopbar onMenu={() => setSidebarOpen((value) => !value)} />
      <section className="notifications-heading"><div><p className="super-admin-eyebrow">Super Admin</p><h1>Notifications</h1><p>Create and send platform notifications.</p></div><div className="reports-actions"><button type="button" disabled={!unreadCount} onClick={markAllRead}>Mark All Read</button><button className="notifications-send-button" type="button" onClick={() => setModalOpen(true)}><Icon><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></Icon>Send Notification</button></div></section>
      <section className="notifications-panel"><header className="notifications-list-heading"><div><h2>Notifications</h2>{error ? <strong className="notifications-error">{error}</strong> : null}</div></header><div className="notifications-tabs">{tabs.map(([value, label]) => <button className={tab === value ? 'is-active' : ''} type="button" key={value} onClick={() => { setTab(value); setPage(1) }}>{tabIcons[value]}<span>{label}</span><b>{tabCounts[value]}</b></button>)}</div><div className="notification-items">{loading ? <div className="notifications-empty">Loading notifications...</div> : visibleItems.length ? visibleItems.map((item) => <article className={`notification-row notification-${item.type}`} key={item.id}><span className="notification-type-icon">{notificationIcon(item.type)}</span><div className="notification-copy"><h3>{item.title}</h3><p>{item.message || 'No message content available.'}</p></div><div className="notification-meta"><span className={`notification-status status-${item.status}`}>{item.status[0].toUpperCase() + item.status.slice(1)}</span><time><Icon><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>{formatDate(item.createdAt)}</time>{item.status === 'unread' ? <button className="notification-delete" type="button" aria-label={`Mark ${item.title} read`} onClick={() => markRead(item.id)}><Icon><path d="m8 12 2.5 2.5L16 9" /><circle cx="12" cy="12" r="9" /></Icon></button> : null}<button className="notification-delete" type="button" aria-label={`Delete ${item.title}`} onClick={() => deleteNotification(item.id)}><Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></Icon></button></div></article>) : <div className="notifications-empty"><span>No notifications available.</span></div>}</div>{!loading && visibleItems.length < filteredItems.length ? <button className="notifications-load-more" type="button" onClick={() => setPage((current) => current + 1)}>Load More</button> : null}</section>
    </main>
    {modalOpen ? <div className="notification-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><form className="notification-modal" onSubmit={sendNotification}><div className="notification-modal-header"><div><p className="super-admin-eyebrow">New message</p><h2>Send Notification</h2></div><button type="button" aria-label="Close" onClick={() => setModalOpen(false)}>x</button></div><label>Title<input required value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="e.g. Low Stock Alert" /></label><label>Message<textarea required rows="4" value={form.message} onChange={(event) => setField('message', event.target.value)} placeholder="Write the notification message..." /></label><label>Target Audience<select value={form.audience} onChange={(event) => setField('audience', event.target.value)}><option value="all-admins">All Admins</option><option value="specific-branch">Specific Branch</option><option value="all-pharmacists">All Pharmacists</option></select></label><div className="notification-modal-actions"><button type="button" onClick={() => setModalOpen(false)}>Cancel</button><button className="notifications-send-button" disabled={sending} type="submit">{sending ? 'Sending...' : 'Send Notification'}</button></div></form></div> : null}
  </div>
}

export default Notifications
