import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { changePharmacyAdminPassword, changeSignedInPharmacistPassword, changeSuperAdminPassword, getSuperAdminProfile } from '../../config/api'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import AdminSidebar from '../Admin/AdminSidebar'
import PharmacistSidebar from '../Pharmacist/PharmacistSidebar'
import UserProfileMenu from '../../components/UserProfileMenu'
import './SuperAdminTopbar.css'
import './SuperAdminProfile.css'

import {
  LuActivity,
  LuArrowLeft,
  LuBell,
  LuCircle,
  LuEyeOff,
  LuKeyRound,
  LuLock,
  LuLogOut,
  LuMail,
  LuShieldCheck,
  LuStethoscope,
  LuUserRound,
} from 'react-icons/lu'

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

  // return (
  //   <div className={`profile-page${isPharmacyAdmin || isPharmacist ? ' profile-admin-shell' : ' profile-super-admin-shell'}${sidebarOpen ? ' sidebar-open' : ''}`}>
  //     {isPharmacyAdmin || isPharmacist ? (
  //       <aside className="profile-sidebar">
  //         <div className="profile-brand">
  //           <b>+</b>
  //           <div>
  //             <strong>PMS</strong>
  //             <small>{roleLabel} Console</small>
  //           </div>
  //         </div>
  //         <nav className="profile-side-nav">
  //           <button type="button" className={tab === 'profile' ? 'active' : ''} onClick={() => { setTab('profile'); navigate(profilePath) }}>
  //             <LuUserRound size={18} />
  //             <span>My Profile</span>
  //           </button>
  //           <button type="button" className={tab === 'password' ? 'active' : ''} onClick={() => { setTab('password'); navigate(passwordPath) }}>
  //             <LuLock size={18} />
  //             <span>Change Password</span>
  //           </button>
  //           <button type="button" className="danger-text" onClick={logout}>
  //             <LuLogOut size={18} />
  //             <span>Logout</span>
  //           </button>
  //         </nav>
  //         <div className="sidebar-user-card">
  //           <div className="sidebar-user-avatar-wrap">
  //             <span className="sidebar-user-avatar">{initials}</span>
  //             <span className="sidebar-user-status-dot" />
  //           </div>
  //           <strong>{name}</strong>
  //           <small>{roleLabel}</small>
  //           <span className="status-text">🟢 Online</span>
  //         </div>
  //       </aside>
  //     ) : (
  //       <SuperAdminSidebar activeLabel="" />
  //     )}
  return (
    <div className={`profile-page profile-super-admin-shell${sidebarOpen ? ' sidebar-open' : ''}`}>

      {isPharmacist ? (
        <PharmacistSidebar activeLabel="" />
      ) : isPharmacyAdmin ? (
        <AdminSidebar activeLabel="" />
      ) : (
        <SuperAdminSidebar activeLabel="" />
      )}

      <main className="profile-main">
        {isPharmacyAdmin || isPharmacist ? (
          <header className="profile-topbar">
            <label className="profile-search">
              <LuUserRound size={18} />
              <input placeholder={isPharmacist ? 'Search dashboard, pending, dispensing, reports...' : 'Search dashboard, branches, admins, reports...'} />
            </label>
            {/* <button className="profile-bell" type="button" onClick={() => navigate(isPharmacist ? '/pharmacist/dashboard' : '/admin/expiry-alerts')} aria-label="View notifications">
              <span aria-hidden="true">♧</span>
            </button> */}
            <button
  className="profile-bell"
  type="button"
  onClick={() => navigate(isPharmacist ? '/pharmacist/dashboard' : '/admin/expiry-alerts')}
  aria-label="View notifications"
>
  <LuBell size={21} strokeWidth={1.8} />
</button>
            <UserProfileMenu roleType={roleType} />
          </header>
        ) : (
          <SuperAdminTopbar onMenu={() => setSidebarOpen((value) => !value)} />
        )}

        {/* CMS PROFILE UI - layout only. Existing routes/APIs/password logic remain unchanged. */}
        <div className="profile-content-wrap">
          <section className="profile-hero">
            <button type="button" className="profile-back-btn" onClick={() => navigate(isPharmacist ? '/pharmacist/dashboard' : isPharmacyAdmin ? '/admin/dashboard' : '/super-admin/dashboard')} aria-label="Go back" title="Return to previous screen">
              <LuArrowLeft size={16} />
              <span>Back</span>
            </button>

            <div className="profile-hero-avatar-wrap">
              <div className="profile-hero-avatar">{initials}</div>
              <span className="profile-hero-role-badge">
                <LuActivity size={12} />
              </span>
            </div>

            <div className="profile-hero-info">
              <div className="profile-hero-top-tag">
                <span className="profile-med-cross-tag">
                  <LuShieldCheck size={12} />
                  Hospital Staff Profile
                </span>
                <span className="profile-station-status">
                  <span className="status-pulse-dot" />
                  Station Active
                </span>
              </div>
              <h2>{name}</h2>
              <p className="profile-hero-email">
                <LuMail size={13} />
                {email}
              </p>
            </div>

            <div className="profile-hero-ecg" aria-hidden="true">
              <svg viewBox="0 0 200 24" className="profile-ecg-svg" preserveAspectRatio="none">
                <path d="M0,12 L45,12 L52,12 L58,3 L64,19 L70,5 L76,14 L82,12 L138,12 L144,3 L150,19 L156,6 L162,14 L168,12 L200,12" fill="none" stroke="rgba(13, 148, 136, 0.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="82" cy="12" r="2.5" fill="#0d9488" className="profile-ecg-runner" />
              </svg>
            </div>
          </section>

          <div className="profile-layout">
            <aside className="profile-tabs">
              <div className="profile-tabs-header">
                <LuActivity size={14} />
                <span>Staff Controls</span>
              </div>

              <button type="button" className={`profile-tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => { setTab('profile'); navigate(profilePath) }} title="View staff medical profile">
                <LuStethoscope size={18} />
                <span className="profile-tab-text">
                  <strong>My Profile</strong>
                  <small>Clinical ID &amp; Credentials</small>
                </span>
                {tab === 'profile' ? <span className="profile-tab-indicator" /> : null}
              </button>

              <button type="button" className={`profile-tab-btn ${tab === 'password' ? 'active' : ''}`} onClick={() => { setTab('password'); navigate(passwordPath) }} title="Update access password">
                <LuKeyRound size={18} />
                <span className="profile-tab-text">
                  <strong>Change Password</strong>
                  <small>Security &amp; HIPAA Vault</small>
                </span>
                {tab === 'password' ? <span className="profile-tab-indicator" /> : null}
              </button>

              <button type="button" className="profile-tab-btn danger" onClick={logout} title="End current clinical session">
                <LuLogOut size={18} />
                <span className="profile-tab-text">
                  <strong>Logout</strong>
                  <small>End Hospital Session</small>
                </span>
              </button>
            </aside>

            <div className="profile-panel">
              {tab === 'profile' ? (
                <div className="profile-view-screen">
                  <div className="profile-panel-header">
                    <div className="profile-panel-title-wrap">
                      <div className="profile-panel-icon-badge">
                        <LuStethoscope size={20} />
                      </div>
                      <div>
                        <h3>Staff Medical Credentials</h3>
                        <p>Verified hospital profile and station assignments</p>
                      </div>
                    </div>
                    <span className="profile-verified-badge">
                      <LuShieldCheck size={13} />
                      Verified Staff
                    </span>
                  </div>

                  <div className="profile-info-grid">
                    <div className="profile-info-card card--email">
                      <div className="profile-card-instrument-badge"><LuMail size={22} /></div>
                      <div className="profile-card-content">
                        <span className="profile-card-label">Official Email</span>
                        <strong className="profile-card-value">{email}</strong>
                        <em className="profile-card-subtag">Primary Communication Channel</em>
                      </div>
                    </div>

                    <div className="profile-info-card card--role">
                      <div className="profile-card-instrument-badge"><LuShieldCheck size={22} /></div>
                      <div className="profile-card-content">
                        <span className="profile-card-label">Clinical Role</span>
                        <strong className="profile-card-value">{roleLabel}</strong>
                        <em className="profile-card-subtag">Authorized Medical Access</em>
                      </div>
                    </div>

                    <div className="profile-info-card card--name">
                      <div className="profile-card-instrument-badge"><LuUserRound size={22} /></div>
                      <div className="profile-card-content">
                        <span className="profile-card-label">Staff Full Name</span>
                        <strong className="profile-card-value">{name}</strong>
                        <em className="profile-card-subtag">Licensed Healthcare Personnel</em>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={updatePassword} noValidate className="profile-form-hospital">
                  <div className="profile-panel-header">
                    <div className="profile-panel-title-wrap">
                      <div className="profile-panel-icon-badge badge--security"><LuKeyRound size={20} /></div>
                      <div>
                        <h3>Hospital Security Credentials</h3>
                        <p>Update access key with HIPAA &amp; NABH compliant standards</p>
                      </div>
                    </div>
                    <span className="profile-security-badge"><LuShieldCheck size={13} /> Encrypted Hospital Vault</span>
                  </div>

                  <label className="profile-field-label">
                    <span className="field-label-text"><LuKeyRound size={14} className="field-label-icon" /> Current Password</span>
                    <div className="profile-password-field">
                      <input type="password" value={form.currentPassword} minLength={8} required placeholder="Enter current password..." autoComplete="current-password" onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
                      <span className="profile-password-toggle profile-lens-toggle" aria-hidden="true"><span className="profile-lens-rim"><LuEyeOff size={17} /></span></span>
                    </div>
                    {submitted && errors.currentPassword ? <span className="field-error-msg">{errors.currentPassword}</span> : null}
                  </label>

                  <label className="profile-field-label">
                    <span className="field-label-text"><LuKeyRound size={14} className="field-label-icon" /> New Password</span>
                    <div className="profile-password-field">
                      <input type="password" value={form.newPassword} minLength={8} required placeholder="Enter strong new password..." autoComplete="new-password" onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
                      <span className="profile-password-toggle profile-lens-toggle" aria-hidden="true"><span className="profile-lens-rim"><LuEyeOff size={17} /></span></span>
                    </div>
                    <ul className="profile-password-requirements" aria-label="Password requirements">
                      <li><span className="requirement-vital-indicator"><LuCircle size={15} /></span><span>Minimum 8 characters</span></li>
                      <li><span className="requirement-vital-indicator"><LuCircle size={15} /></span><span>At least 1 uppercase letter (A-Z)</span></li>
                      <li><span className="requirement-vital-indicator"><LuCircle size={15} /></span><span>At least 1 lowercase letter (a-z)</span></li>
                      <li><span className="requirement-vital-indicator"><LuCircle size={15} /></span><span>At least 1 number (0-9)</span></li>
                      <li><span className="requirement-vital-indicator"><LuCircle size={15} /></span><span>At least 1 special character (@, #, $, %, etc.)</span></li>
                    </ul>
                  </label>

                  <label className="profile-field-label">
                    <span className="field-label-text"><LuKeyRound size={14} className="field-label-icon" /> Confirm Password</span>
                    <div className="profile-password-field">
                      <input type="password" value={form.confirmPassword} minLength={8} required placeholder="Confirm new password..." autoComplete="new-password" onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
                      <span className="profile-password-toggle profile-lens-toggle" aria-hidden="true"><span className="profile-lens-rim"><LuEyeOff size={17} /></span></span>
                    </div>
                    {submitted && errors.confirmPassword ? <span className="field-error-msg">{errors.confirmPassword}</span> : null}
                  </label>

                  <div className="profile-form-actions">
                    <button type="button" className="profile-cancel-btn">Cancel</button>
                    <button type="submit" className="profile-save" title="Update Password"><LuLock size={16} /><span>Update Password</span></button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
