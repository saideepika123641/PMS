import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutPharmacist, logoutPharmacyAdmin, logoutSuperAdmin } from '../config/api'
import { useToast } from './ToastProvider'
import './UserProfileMenu.css'

function MenuIcon({ name, size = 20, className = '' }) {
  const paths = {
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M15 4h4v4" /></>,
    logout: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></>,
  }

  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function initials(value) {
  const text = String(value || '').trim()
  if (!text) return 'U'
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function readUser(keys) {
  for (const key of keys) {
    const value = sessionStorage.getItem(key) || localStorage.getItem(key)
    if (!value) continue
    try {
      return JSON.parse(value)
    } catch {
      return { email: value }
    }
  }
  return null
}

function getProfile(roleType) {
  if (roleType === 'pharmacist') {
    const user = readUser(['pharmacistUser'])
    const assignment = readUser(['pharmacistAssignment'])
    return {
      name: user?.name || user?.fullName || user?.email || 'Pharmacist',
      email: user?.email || '',
      roleLabel: 'Pharmacist',
      branchName: assignment?.branchName || assignment?.branch?.name || assignment?.pharmacyName || 'Branch',
      profilePath: '/pharmacist/profile',
      passwordPath: '/pharmacist/change-password',
    }
  }

  if (roleType === 'pharmacy-admin') {
    const user = readUser(['pharmacyAdminUser'])
    const assignment = readUser(['pharmacyAdminAssignment'])
    return {
      name: user?.name || user?.fullName || user?.email || 'Admin',
      email: user?.email || '',
      roleLabel: 'Admin',
      branchName: assignment?.branchName || assignment?.branch?.name || assignment?.pharmacyName || 'Branch A',
      profilePath: '/admin/profile',
      passwordPath: '/admin/change-password',
    }
  }

  const user = readUser(['superAdminUser'])
  return {
    name: user?.name || user?.fullName || user?.email || 'Super Admin',
    email: user?.email || '',
    roleLabel: 'Super Admin',
    branchName: '',
    profilePath: '/profile',
    passwordPath: '/profile?tab=password',
  }
}

function clearRoleSession(roleType) {
  const keys = roleType === 'pharmacist'
    ? ['pharmacistToken', 'pharmacistUser', 'pharmacistAssignment']
    : roleType === 'pharmacy-admin'
    ? ['pharmacyAdminToken', 'pharmacyAdminUser', 'pharmacyAdminAssignment']
    : ['superAdminToken', 'superAdminUser']

  keys.forEach((key) => {
    sessionStorage.removeItem(key)
    localStorage.removeItem(key)
  })
}

function UserProfileMenu({ roleType = 'pharmacy-admin' }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const profile = getProfile(roleType)

  useEffect(() => {
    const close = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function logout() {
    const tokenKey = roleType === 'pharmacist' ? 'pharmacistToken' : roleType === 'pharmacy-admin' ? 'pharmacyAdminToken' : 'superAdminToken'
    const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey)

    try {
      if (roleType === 'pharmacist') await logoutPharmacist(token)
      else if (roleType === 'pharmacy-admin') await logoutPharmacyAdmin(token)
      else await logoutSuperAdmin(token)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      clearRoleSession(roleType)
      navigate('/login', { replace: true })
    }
  }

  function goTo(path) {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="user-profile-wrap" ref={wrapRef}>
      <button className={`user-profile-chip${open ? ' open' : ''}`} type="button" onClick={() => setOpen((value) => !value)} title={`${profile.name} ${profile.email}`.trim()}>
        <span className="user-profile-avatar-shell">
          <span className="user-profile-avatar">{initials(profile.name || profile.email)}</span>
          <span className="user-profile-online-dot" />
        </span>
        <span className="user-profile-copy">
          <strong>{profile.name}</strong>
          {roleType === 'pharmacist' ? (
            <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Online
            </span>
          ) : (
            <em>{profile.email}</em>
          )}
        </span>
        <MenuIcon name="chevronDown" size={18} className="user-profile-chevron" />
      </button>

      {/* {open ? (
        <div className="user-profile-dropdown">
          <div className="user-profile-head">
            <span className="user-profile-head-avatar">{initials(profile.name || profile.email)}</span>
            <span className="user-profile-head-copy">
              <strong>{profile.name}</strong>
              <span>{profile.email}</span>
              <em>{profile.roleLabel}</em>
            </span>
          </div>
          {profile.branchName ? <div className="user-profile-branch-switch"><span>Branch</span><strong>{profile.branchName}</strong></div> : null}
          <button type="button" onClick={() => goTo(profile.profilePath)}>
            <span className="user-profile-menu-icon"><MenuIcon name="user" /></span>
            <span className="user-profile-menu-copy"><b>My Profile</b><small>View and edit your profile</small></span>
            <MenuIcon name="chevronRight" size={17} className="user-profile-menu-arrow" />
          </button>
          <button type="button" onClick={() => goTo(profile.passwordPath)}>
            <span className="user-profile-menu-icon"><MenuIcon name="key" /></span>
            <span className="user-profile-menu-copy"><b>Change Password</b><small>Update your password</small></span>
            <MenuIcon name="chevronRight" size={17} className="user-profile-menu-arrow" />
          </button>
          <button type="button" className="danger" onClick={logout}>
            <span className="user-profile-menu-icon danger"><MenuIcon name="logout" /></span>
            <span className="user-profile-menu-copy"><b>Logout</b><small>Sign out from your account</small></span>
          </button>
        </div>
      ) : null} */}


      {open ? (
  <div
    className="user-profile-dropdown hc-pms-profile-dropdown"
    role="menu"
    aria-label="User Profile Menu"
  >
    {/* Profile Header - UI only */}
    <button
      type="button"
      className="hc-profile-header"
      onClick={() => goTo(profile.profilePath)}
      title="View Profile"
    >
      <span className="hc-profile-avatar-box">
        <span className="hc-profile-avatar-circle">
          {initials(profile.name || profile.email)}
        </span>
      </span>

      <span className="hc-profile-info">
        <strong className="hc-profile-name">
          {profile.name}
        </strong>

        <span className="hc-profile-email">
          {profile.email}
        </span>

        <span className="hc-profile-badge">
          {profile.roleLabel}
        </span>
      </span>
    </button>

    {/* CMS-style menu items */}
    <div className="hc-dropdown-list">

      {/* My Profile */}
      <button
        type="button"
        role="menuitem"
        className="hc-dropdown-item hc-dropdown-item--pink"
        onClick={() => goTo(profile.profilePath)}
      >
        <span className="hc-hero-circle-badge">
          <MenuIcon name="user" size={15} />
        </span>

        <span className="hc-dropdown-item-content">
          <span className="hc-dropdown-item-title">
            My Profile
          </span>

          <span className="hc-dropdown-item-subtitle">
            View and edit your profile
          </span>
        </span>

        <span className="hc-pill-tag hc-pill-tag--pink">
          ONLINE
        </span>
      </button>

      {/* Change Password */}
      <button
        type="button"
        role="menuitem"
        className="hc-dropdown-item hc-dropdown-item--orange"
        onClick={() => goTo(profile.passwordPath)}
      >
        <span className="hc-hero-circle-badge">
          <MenuIcon name="key" size={15} />
        </span>

        <span className="hc-dropdown-item-content">
          <span className="hc-dropdown-item-title">
            Change Password
          </span>

          <span className="hc-dropdown-item-subtitle">
            Update your password
          </span>
        </span>

        <span className="hc-pill-tag hc-pill-tag--white">
          SECURITY
        </span>
      </button>

      {/* Logout */}
      <button
        type="button"
        role="menuitem"
        className="hc-dropdown-item hc-dropdown-item--danger"
        onClick={logout}
      >
        <span className="hc-hero-circle-badge">
          <MenuIcon name="logout" size={15} />
        </span>

        <span className="hc-dropdown-item-content">
          <span className="hc-dropdown-item-title">
            Logout
          </span>

          <span className="hc-dropdown-item-subtitle">
            Sign out from your account
          </span>
        </span>

        <span className="hc-pill-tag hc-pill-tag--white">
          EXIT
        </span>
      </button>

    </div>
  </div>
) : null}

    </div>
  )
}

export default UserProfileMenu
