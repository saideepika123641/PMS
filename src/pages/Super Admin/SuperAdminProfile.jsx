import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { changePharmacyAdminPassword, changeSignedInPharmacistPassword, changeSuperAdminPassword, getSuperAdminProfile } from '../../config/api'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import PharmacistSidebar from '../Pharmacist/PharmacistSidebar'
import UserProfileMenu from '../../components/UserProfileMenu'
import './SuperAdminTopbar.css'
import './SuperAdminProfile.css'

function Icon({ children }) {
  return <svg className="profile-topbar-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
}

function readStoredUser(key) {
  const value = sessionStorage.getItem(key) || localStorage.getItem(key)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return { email: value }
  }
}

export default function SuperAdminProfile({ initialTab = 'profile', roleType = 'super-admin' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tab, setTab] = useState(initialTab)
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [submitted, setSubmitted] = useState(false)
  const isPharmacyAdmin = roleType === 'pharmacy-admin'
  const isPharmacist = roleType === 'pharmacist'
  const [profileUser, setProfileUser] = useState(null)

  const routeTab = searchParams.get('tab') === 'password' ? 'password' : initialTab

  useEffect(() => setTab(routeTab), [routeTab])

  const user = readStoredUser(
    isPharmacist ? 'pharmacistUser' : isPharmacyAdmin ? 'pharmacyAdminUser' : 'superAdminUser'
  )
  const name = user?.name || user?.fullName || (isPharmacist ? 'Pharmacist' : isPharmacyAdmin ? 'Admin' : 'Super Admin')
  const email = user?.email || (isPharmacist ? 'pharmacist@gmail.com' : isPharmacyAdmin ? 'admin@gmail.com' : 'superadmin@gmail.com')
  const roleLabel = isPharmacist ? 'Pharmacist' : isPharmacyAdmin ? 'Admin' : 'Super Admin'
  
  const getInitials = (val) => {
    const text = String(val || '').trim()
    if (!text) return 'PH'
    const parts = text.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  const initials = isPharmacist ? getInitials(name) : isPharmacyAdmin ? 'AD' : 'SA'

  const profilePath = isPharmacist ? '/pharmacist/profile' : isPharmacyAdmin ? '/admin/profile' : '/profile'
  const passwordPath = isPharmacist ? '/pharmacist/change-password' : isPharmacyAdmin ? '/admin/change-password' : '/profile?tab=password'

  function validateField(fieldName, value, compareValue = '') {
    if (!value) return 'Please fill the box.'
    if (fieldName === 'newPassword') {
      if (value.length < 8) return 'Password must be at least 8 characters.'
      if (!/[A-Z]/.test(value)) return 'At least 1 uppercase letter.'
      if (!/[a-z]/.test(value)) return 'At least 1 lowercase letter.'
      if (!/[0-9]/.test(value)) return 'At least 1 number.'
      if (!/[^A-Za-z0-9]/.test(value)) return 'At least 1 special character.'
    }
    if (fieldName === 'confirmPassword' && value !== compareValue) {
      return 'Passwords do not match.'
    }
    return ''
  }

  async function updatePassword(event) {
    event.preventDefault()
    setSubmitted(true)

    const curErr = validateField('currentPassword', form.currentPassword)
    const newErr = validateField('newPassword', form.newPassword)
    const confErr = validateField('confirmPassword', form.confirmPassword, form.newPassword)

    setErrors({
      currentPassword: curErr,
      newPassword: newErr,
      confirmPassword: confErr
    })

    if (curErr || newErr || confErr) {
      return
    }

    try {
      const changePassword = isPharmacist ? changeSignedInPharmacistPassword : isPharmacyAdmin ? changePharmacyAdminPassword : changeSuperAdminPassword
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      showToast('Password changed successfully.')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSubmitted(false)
      setErrors({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  function logout() {
    const keys = isPharmacyAdmin
      ? ['pharmacyAdminToken', 'pharmacyAdminUser', 'pharmacyAdminAssignment']
      : isPharmacist
      ? ['pharmacistToken', 'pharmacistUser', 'pharmacistAssignment']
      : ['superAdminToken', 'superAdminUser']

    keys.forEach((key) => {
      sessionStorage.removeItem(key)
      localStorage.removeItem(key)
    })
    navigate('/login')
  }

  return (
    <div className={`profile-page${isPharmacyAdmin || isPharmacist ? ' profile-admin-shell' : ' profile-super-admin-shell'}${sidebarOpen ? ' sidebar-open' : ''}`}>
      {isPharmacyAdmin || isPharmacist ? (
        <aside className="profile-sidebar">
          <div className="profile-brand">
            <b>+</b>
            <div>
              <strong>PMS</strong>
              <small>{roleLabel} Console</small>
            </div>
          </div>
          <nav className="profile-side-nav">
            <button
              type="button"
              className={tab === 'profile' ? 'active' : ''}
              onClick={() => { setTab('profile'); navigate(profilePath) }}
            >
              <svg className="sidebar-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>My Profile</span>
            </button>
            <button
              type="button"
              className={tab === 'password' ? 'active' : ''}
              onClick={() => { setTab('password'); navigate(passwordPath) }}
            >
              <svg className="sidebar-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Change Password</span>
            </button>
            <button type="button" className="danger-text" onClick={logout}>
              <svg className="sidebar-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Logout</span>
            </button>
          </nav>
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar-wrap">
              <span className="sidebar-user-avatar">{initials}</span>
              <span className="sidebar-user-status-dot" />
            </div>
            <strong>{name}</strong>
            <small>{roleLabel}</small>
            <span className="status-text">🟢 Online</span>
          </div>
        </aside>
      ) : (
        <SuperAdminSidebar activeLabel="" />
      )}
      <main className="profile-main">
        {isPharmacyAdmin || isPharmacist ? (
          <header className="profile-topbar">
            <label className="profile-search"><Icon><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></Icon><input placeholder={isPharmacist ? "Search dashboard, pending, dispensing, reports..." : "Search dashboard, branches, admins, reports..."} /></label>
            <button
              className="profile-bell"
              type="button"
              onClick={() => navigate(isPharmacist ? '/pharmacist/dashboard' : '/admin/expiry-alerts')}
              aria-label="View notifications"
            >
              <Icon><path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2-2-9" /><path d="M10 21h4" /></Icon>
            </button>
            <UserProfileMenu roleType={roleType} />
          </header>
        ) : (
          <SuperAdminTopbar onMenu={() => setSidebarOpen((value) => !value)} />
        )}
        <div className="profile-content-wrap">
          <section className={isPharmacyAdmin || isPharmacist ? "profile-hero" : "profile-hero super-admin-hero"}>
            <button className="profile-back" type="button" onClick={() => navigate(isPharmacist ? '/pharmacist/dashboard' : isPharmacyAdmin ? '/admin/dashboard' : '/super-admin/dashboard')}>Back</button>
            {isPharmacyAdmin || isPharmacist ? (
              <>
                <span className="profile-hero-avatar">{initials}</span>
                <div className="profile-hero-copy">
                  <h1>{name}</h1>
                  <p>{email}</p>
                </div>
              </>
            ) : (
              <>
                <span>{initials}</span>
                <div>
                  <h1>{name}</h1>
                  <p>{email}</p>
                </div>
              </>
            )}
          </section>
          <section className={`profile-panel${isPharmacyAdmin || isPharmacist ? ' profile-panel-full' : ''}`}>
            {!(isPharmacyAdmin || isPharmacist) && (
              <nav className="profile-tabs">
                <button className={tab === 'profile' ? 'active' : ''} onClick={() => { setTab('profile'); navigate(profilePath) }} type="button">My Profile</button>
                <button className={tab === 'password' ? 'active' : ''} onClick={() => { setTab('password'); navigate(passwordPath) }} type="button">Change Password</button>
                <button className="danger" onClick={logout} type="button">Logout</button>
              </nav>
            )}
            {tab === 'profile' ? (
              isPharmacyAdmin || isPharmacist ? (
                <div className="profile-details-modern">
                  <h2>My Profile</h2>
                  <div className="profile-detail-grid">
                    <article className="profile-detail-card email-card">
                      <div className="profile-card-icon-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </div>
                      <div className="profile-card-text">
                        <small>Email</small>
                        <strong>{email}</strong>
                      </div>
                    </article>
                    <article className="profile-detail-card role-card">
                      <div className="profile-card-icon-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <div className="profile-card-text">
                        <small>Role</small>
                        <strong>{roleLabel}</strong>
                      </div>
                    </article>
                    <article className="profile-detail-card name-card">
                      <div className="profile-card-icon-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <div className="profile-card-text">
                        <small>Name</small>
                        <strong>{name}</strong>
                      </div>
                    </article>
                  </div>

                  <div className="profile-quick-actions-wrap">
                    <h3>Quick Actions</h3>
                    <div className="profile-actions-grid">
                      <button 
                        type="button" 
                        className="profile-action-card dashboard-act"
                        onClick={() => navigate(isPharmacist ? '/pharmacist/dashboard' : '/admin/dashboard')}
                      >
                        <div className="profile-action-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        </div>
                        <div className="profile-action-info">
                          <strong>View Dashboard</strong>
                          <small>Go to main dashboard</small>
                        </div>
                      </button>
                      <button 
                        type="button" 
                        className="profile-action-card password-act"
                        onClick={() => { setTab('password'); navigate(passwordPath) }}
                      >
                        <div className="profile-action-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <div className="profile-action-info">
                          <strong>Change Password</strong>
                          <small>Update your password</small>
                        </div>
                      </button>
                      <button 
                        type="button" 
                        className="profile-action-card logout-act"
                        onClick={logout}
                      >
                        <div className="profile-action-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        </div>
                        <div className="profile-action-info">
                          <strong>Logout</strong>
                          <small>Sign out from account</small>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="profile-details">
                  <h2>My Profile</h2>
                  <div className="profile-detail-grid">
                    <article><b>@</b><small>Email</small><strong>{email}</strong></article>
                    <article><b>#</b><small>Role</small><strong>{roleLabel}</strong></article>
                    <article><b>ID</b><small>Name</small><strong>{name}</strong></article>
                  </div>
                </div>
              )
            ) : (
              <form className="password-form" onSubmit={updatePassword}>
                <h2>Change Password</h2>
                <label>
                  Current Password
                  <input 
                    type="password" 
                    value={form.currentPassword} 
                    onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} 
                    style={{
                      borderColor: submitted && errors.currentPassword ? '#ef4444' : '',
                      backgroundColor: submitted && errors.currentPassword ? '#fff5f5' : ''
                    }}
                  />
                  {submitted && errors.currentPassword && <span className="field-error-msg">{errors.currentPassword}</span>}
                </label>
                <label>
                  New Password
                  <input 
                    type="password" 
                    value={form.newPassword} 
                    onChange={(event) => setForm({ ...form, newPassword: event.target.value })} 
                    style={{
                      borderColor: submitted && errors.newPassword ? '#ef4444' : '',
                      backgroundColor: submitted && errors.newPassword ? '#fff5f5' : ''
                    }}
                  />
                  {submitted && errors.newPassword && <span className="field-error-msg">{errors.newPassword}</span>}
                </label>
                <ul>
                  <li>Minimum 8 characters</li>
                  <li>At least 1 uppercase letter (A-Z)</li>
                  <li>At least 1 lowercase letter (a-z)</li>
                  <li>At least 1 number (0-9)</li>
                  <li>At least 1 special character (@, #, $, %, etc.)</li>
                </ul>
                <label>
                  Confirm Password
                  <input 
                    type="password" 
                    value={form.confirmPassword} 
                    onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} 
                    style={{
                      borderColor: submitted && errors.confirmPassword ? '#ef4444' : '',
                      backgroundColor: submitted && errors.confirmPassword ? '#fff5f5' : ''
                    }}
                  />
                  {submitted && errors.confirmPassword && <span className="field-error-msg">{errors.confirmPassword}</span>}
                </label>
                <button type="submit">Update Password</button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
