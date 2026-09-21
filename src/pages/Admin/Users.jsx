import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import {
  assignPharmacistToAdminPharmacy,
  changePharmacistStatus,
  createPharmacist,
  deletePharmacist,
  getPharmacistPermissions,
  listPharmacists,
  resetPharmacistPassword,
  updatePharmacist,
  updatePharmacistPermissions,
} from '../../config/api'
import AdminLayout from './AdminLayout'

const emptyForm = { name: '', email: '', phone: '', password: '' }
const permissionKeys = ['prescriptions', 'dispensing', 'stock', 'reports']

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.pharmacists)) return response.data.pharmacists
  if (Array.isArray(response?.pharmacists)) return response.pharmacists
  if (Array.isArray(response?.results)) return response.results
  return []
}

function getId(item) {
  return item?._id || item?.id || item?.pharmacistId || item?.uuid
}

function getName(item) {
  return item?.name || item?.fullName || item?.pharmacistName || item?.email || 'Pharmacist'
}

const LOCAL_PHONES_KEY = 'pms_pharmacist_phones'

function getLocalPhones() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PHONES_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveLocalPhone(key, phone) {
  if (!key || !phone) return
  try {
    const map = getLocalPhones()
    map[String(key)] = String(phone).trim()
    localStorage.setItem(LOCAL_PHONES_KEY, JSON.stringify(map))
  } catch {}
}

function getPhone(item) {
  if (!item) return ''
  const direct =
    item.phone ||
    item.mobile ||
    item.mobileNumber ||
    item.phoneNumber ||
    item.contactNumber ||
    item.contact ||
    item.contactNo ||
    item.mobileNo ||
    item.phone_number ||
    item.mobile_number

  if (direct && String(direct).trim() && String(direct).trim() !== '-') return String(direct).trim()

  const nested = item.user || item.userId || item.pharmacist || item.pharmacistId || item.profile || item.details
  if (nested && typeof nested === 'object') {
    const val =
      nested.phone ||
      nested.mobile ||
      nested.mobileNumber ||
      nested.phoneNumber ||
      nested.contactNumber ||
      nested.contact ||
      nested.contactNo ||
      nested.mobileNo ||
      nested.phone_number ||
      nested.mobile_number

    if (val && String(val).trim() && String(val).trim() !== '-') return String(val).trim()
  }

  const id = getId(item)
  const localMap = getLocalPhones()
  if (id && localMap[String(id)]) return localMap[String(id)]
  if (item.email && localMap[String(item.email)]) return localMap[String(item.email)]

  return ''
}

function PasswordIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      {visible ? (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.7 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-3 4.1" />
          <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
          <path d="M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.4 4-1" />
        </>
      )}
    </svg>
  )
}

function isPharmacistActive(item) {
  if (!item) return false

  // Check explicit status string first
  const raw = String(item.status || item.user?.status || item.userId?.status || '').toLowerCase().trim()
  if (['inactive', 'deactivated', 'disabled', 'blocked', 'suspended', 'false', '0'].includes(raw)) {
    return false
  }
  if (['active', 'activated', 'enabled', 'true', '1'].includes(raw)) {
    return true
  }

  // Check explicit booleans
  if (item.isActive === false || item.is_active === false || item.active === false) return false
  if (item.user?.isActive === false || item.userId?.isActive === false) return false
  if (item.isActive === true || item.is_active === true || item.active === true) return true
  if (item.user?.isActive === true || item.userId?.isActive === true) return true

  return true
}

function getStatus(item) {
  return isPharmacistActive(item) ? 'Active' : 'Inactive'
}

function Users({ initialAdd = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const isAddRoute = initialAdd || location.pathname.endsWith('/add')
  const [pharmacists, setPharmacists] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showTempPassword, setShowTempPassword] = useState(false)
  const [formOpen, setFormOpen] = useState(isAddRoute)
  const [form, setForm] = useState(emptyForm)
  const [permissionsFor, setPermissionsFor] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [resetting, setResetting] = useState(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')

  useEffect(() => {
    if (location.pathname.endsWith('/add')) {
      setEditing(null)
      setShowPassword(false)
      setForm({ name: '', email: '', phone: '', password: '' })
      setFormErrors({})
      setFormOpen(true)
      const timer = setTimeout(() => {
        setForm((prev) => (editing ? prev : { name: '', email: '', phone: '', password: '' }))
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [location.pathname])

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return pharmacists
    return pharmacists.filter((item) => {
      const name = getName(item).toLowerCase()
      const email = String(item.email || '').toLowerCase()
      const phone = getPhone(item).toLowerCase()
      return name.includes(value) || email.includes(value) || phone.includes(value) || JSON.stringify(item).toLowerCase().includes(value)
    })
  }, [pharmacists, query])

  async function loadPharmacists() {
    setLoading(true)
    try {
      const response = await listPharmacists({ search: query })
      setPharmacists(normalizeList(response))
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPharmacists()
  }, [])

  const [formErrors, setFormErrors] = useState({})

  function validateForm() {
    const errs = {}
    const nameVal = (form.name || '').trim()
    if (!nameVal) {
      errs.name = 'Pharmacist Name is required.'
    } else if (nameVal.length < 2) {
      errs.name = 'Pharmacist Name must be at least 2 characters.'
    }

    const emailVal = (form.email || '').trim()
    if (!emailVal) {
      errs.email = 'Email Address is required.'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailVal)) {
        errs.email = 'Please enter a valid email address.'
      }
    }

    const phoneVal = (form.phone || '').trim()
    if (phoneVal) {
      const cleanPhone = phoneVal.replace(/[+\-\s()]/g, '')
      if (isNaN(Number(cleanPhone)) || cleanPhone.length < 8) {
        errs.phone = 'Please enter a valid phone number (at least 8 digits).'
      }
    }

    if (!editing) {
      const passVal = form.password
      if (!passVal) {
        errs.password = 'Password is required for new accounts.'
      } else if (passVal.length < 6) {
        errs.password = 'Password must be at least 6 characters.'
      }
    } else if (form.password && form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    }

    setFormErrors(errs)
    const firstKey = Object.keys(errs)[0]
    if (firstKey) {
      const el = document.getElementById(`user-${firstKey}`)
      if (el) el.focus()
    }
    return Object.keys(errs).length === 0
  }

  function openCreate() {
    setEditing(null)
    setShowPassword(false)
    setForm(emptyForm)
    setFormErrors({})
    setFormOpen(true)
    if (!location.pathname.endsWith('/add')) {
      navigate('/admin/users/add')
    }
  }

  async function openEdit(pharmacist) {
    setEditing(pharmacist)
    setShowPassword(false)
    const currentPhone = getPhone(pharmacist)
    setForm({
      name: getName(pharmacist),
      email: pharmacist?.email || pharmacist?.user?.email || pharmacist?.userId?.email || '',
      phone: currentPhone,
      password: '',
    })
    setFormErrors({})
    setFormOpen(true)

    // Fetch full details in case list query omitted phone
    const id = getId(pharmacist)
    if (id) {
      try {
        const res = await getPharmacist(id)
        const fresh = res?.data?.pharmacist || res?.data || res?.pharmacist || res
        if (fresh) {
          const freshPhone = getPhone(fresh)
          if (freshPhone) {
            setForm((prev) => ({
              ...prev,
              phone: prev.phone || freshPhone,
            }))
            saveLocalPhone(id, freshPhone)
            if (fresh.email) saveLocalPhone(fresh.email, freshPhone)
          }
        }
      } catch (e) {
        // Continue with initial data
      }
    }
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setShowPassword(false)
    setForm(emptyForm)
    setFormErrors({})
    if (location.pathname.endsWith('/add')) {
      navigate('/admin/users')
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    const phoneVal = (form.phone || '').trim()
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: phoneVal,
      mobile: phoneVal,
      mobileNumber: phoneVal,
      phoneNumber: phoneVal,
      contactNumber: phoneVal,
      contact: phoneVal,
      mobileNo: phoneVal,
      ...(form.password ? { password: form.password } : {}),
    }

    try {
      const response = editing ? await updatePharmacist(getId(editing), payload) : await createPharmacist(payload)
      const targetId = editing ? getId(editing) : getId(response?.data || response?.pharmacist || response)
      if (targetId && phoneVal) {
        saveLocalPhone(targetId, phoneVal)
      }
      if (form.email && phoneVal) {
        saveLocalPhone(form.email, phoneVal)
      }

      // Optimistically update list so table reflects phone immediately
      if (editing) {
        setPharmacists((prev) =>
          prev.map((p) => {
            if (getId(p) === getId(editing)) {
              return {
                ...p,
                name: form.name.trim(),
                email: form.email.trim(),
                phone: phoneVal,
                mobile: phoneVal,
                mobileNumber: phoneVal,
                phoneNumber: phoneVal,
                user: p.user ? { ...p.user, name: form.name.trim(), email: form.email.trim(), phone: phoneVal, mobile: phoneVal } : p.user,
              }
            }
            return p
          })
        )
      }

      showToast(response?.message || `Pharmacist ${editing ? 'updated' : 'created'} successfully.`)
      closeForm()
      await loadPharmacists()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(pharmacist) {
    if (!window.confirm(`Delete ${getName(pharmacist)}?`)) return
    try {
      const response = await deletePharmacist(getId(pharmacist))
      showToast(response?.message || 'Pharmacist deleted successfully.')
      await loadPharmacists()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function handleStatus(pharmacist) {
    const id = getId(pharmacist)
    if (!id || togglingId === id) return

    const currentlyActive = isPharmacistActive(pharmacist)
    const nextActive = !currentlyActive
    const nextStatus = nextActive ? 'Active' : 'Inactive'
    const nextStatusLower = nextActive ? 'active' : 'inactive'

    // Optimistically update local list so UI reflects immediately
    setPharmacists((prev) =>
      prev.map((p) => {
        if (getId(p) === id) {
          return {
            ...p,
            status: nextStatus,
            isActive: nextActive,
            active: nextActive,
            is_active: nextActive,
            ...(p.user ? { user: { ...p.user, status: nextStatus, isActive: nextActive } } : {}),
            ...(p.userId ? { userId: { ...p.userId, status: nextStatus, isActive: nextActive } } : {}),
          }
        }
        return p
      })
    )

    setTogglingId(id)

    try {
      const payload = {
        status: nextStatus,
        isActive: nextActive,
        active: nextActive,
      }

      let response
      try {
        response = await changePharmacistStatus(id, payload)
      } catch (err) {
        // Fallback: try lowercase status or updatePharmacist
        try {
          response = await changePharmacistStatus(id, {
            status: nextStatusLower,
            isActive: nextActive,
          })
        } catch (err2) {
          response = await updatePharmacist(id, payload)
        }
      }

      const defaultMsg = nextActive
        ? 'Pharmacist activated successfully.'
        : 'Pharmacist deactivated successfully.'

      showToast(response?.message || defaultMsg)
      await loadPharmacists()
    } catch (error) {
      showToast(error.message || 'Failed to update pharmacist status.', 'error')
      await loadPharmacists()
    } finally {
      setTogglingId(null)
    }
  }

  async function handleAssign(pharmacist) {
    try {
      const response = await assignPharmacistToAdminPharmacy(getId(pharmacist))
      showToast(response?.message || 'Admin pharmacy assigned to pharmacist.')
      await loadPharmacists()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function openPermissions(pharmacist) {
    setPermissionsFor(pharmacist)
    setPermissions(pharmacist?.permissions || {})
    try {
      const response = await getPharmacistPermissions(getId(pharmacist))
      const permissionData = response?.data?.permissions || response?.permissions || response?.data || response || {}
      setPermissions(permissionData)
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function handlePermissions(event) {
    event.preventDefault()
    try {
      const response = await updatePharmacistPermissions(getId(permissionsFor), { permissions })
      showToast(response?.message || 'Pharmacist permissions updated successfully.')
      setPermissionsFor(null)
      await loadPharmacists()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault()
    try {
      const response = await resetPharmacistPassword(getId(resetting), { temporaryPassword, password: temporaryPassword })
      showToast(response?.message || 'Temporary password set successfully.')
      setResetting(null)
      setTemporaryPassword('')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  // =========================================================================
  // SEPARATE SCREEN: Create / Edit Pharmacist
  // =========================================================================
  if (formOpen) {
    return (
      <AdminLayout
        activeLabel="Users"
        title={editing ? 'Edit Pharmacist' : 'Create Pharmacist'}
        subtitle={editing ? 'Update pharmacist credentials and contact details.' : 'Enter new pharmacist information and access credentials.'}
        headerAction={
          <button
            type="button"
            className="btn-secondary"
            onClick={closeForm}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Pharmacists
          </button>
        }
      >
        <section className="branch-panel pharmacist-create-panel" style={{ maxWidth: '840px', margin: '0 auto', borderTop: '3.5px solid #2563eb' }}>
          <div className="branch-panel-heading">
            <div>
              <h2>{editing ? 'Edit Pharmacist Profile' : 'New Pharmacist Registration'}</h2>
              <p>Fields marked with * are required. Credentials will be used for pharmacist portal login.</p>
            </div>
          </div>

          <form onSubmit={handleSave} noValidate autoComplete="off" className="pharmacist-screen-form">
            {/* Honeypot fields to absorb browser auto-filling of saved admin credentials */}
            <input type="text" name="fake_username_remembered" style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex="-1" autoComplete="off" readOnly defaultValue="" />
            <input type="password" name="fake_password_remembered" style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex="-1" autoComplete="new-password" readOnly defaultValue="" />

            <div className="pharmacist-form-grid">
              <div className="pharmacist-form-field">
                <label htmlFor="user-name">Full Name *</label>
                <input
                  id="user-name"
                  name="pharmacist_fullname"
                  autoComplete="off"
                  value={form.name}
                  onChange={(event) => {
                    setForm({ ...form, name: event.target.value })
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' })
                  }}
                  className={formErrors.name ? 'has-error' : ''}
                  placeholder="e.g. Rahul Jonnala"
                  required
                />
                {formErrors.name && (
                  <span className="form-error-msg">{formErrors.name}</span>
                )}
              </div>

              <div className="pharmacist-form-field">
                <label htmlFor="user-email">Email Address *</label>
                <input
                  type="email"
                  id="user-email"
                  name="pharmacist_new_email"
                  autoComplete="new-password"
                  value={form.email}
                  onChange={(event) => {
                    setForm({ ...form, email: event.target.value })
                    if (formErrors.email) setFormErrors({ ...formErrors, email: '' })
                  }}
                  className={formErrors.email ? 'has-error' : ''}
                  placeholder="e.g. pharmacist@hospital.com"
                  required
                />
                {formErrors.email && (
                  <span className="form-error-msg">{formErrors.email}</span>
                )}
              </div>

              <div className="pharmacist-form-field">
                <label htmlFor="user-phone">Phone Number</label>
                <input
                  id="user-phone"
                  name="pharmacist_new_phone"
                  autoComplete="off"
                  value={form.phone}
                  onChange={(event) => {
                    setForm({ ...form, phone: event.target.value })
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' })
                  }}
                  className={formErrors.phone ? 'has-error' : ''}
                  placeholder="e.g. +91 98765 43210"
                />
                {formErrors.phone && (
                  <span className="form-error-msg">{formErrors.phone}</span>
                )}
              </div>

              <div className="pharmacist-form-field">
                <label htmlFor="user-password">
                  Password {editing ? '(Leave blank to keep current)' : '*'}
                </label>
                <div className="password-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="user-password"
                    name="pharmacist_new_password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => {
                      setForm({ ...form, password: event.target.value })
                      if (formErrors.password) setFormErrors({ ...formErrors, password: '' })
                    }}
                    className={formErrors.password ? 'has-error' : ''}
                    placeholder={editing ? '••••••••' : 'Minimum 6 characters'}
                    required={!editing}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <PasswordIcon visible={showPassword} />
                  </button>
                </div>
                {formErrors.password && (
                  <span className="form-error-msg">{formErrors.password}</span>
                )}
              </div>
            </div>

            <div className="pharmacist-form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeForm}
              >
                Cancel
              </button>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Pharmacist'}
              </button>
            </div>
          </form>
        </section>
      </AdminLayout>
    )
  }

  // =========================================================================
  // MAIN TABLE SCREEN: Pharmacists Directory
  // =========================================================================
  return (
    <AdminLayout activeLabel="Users" title="Manage Pharmacists" subtitle="Admin / Pharmacists">
      <section className="branch-panel pharmacist-panel">
        <div className="branch-panel-heading">
          <div>
            <h2>Pharmacists</h2>
            <p>Manage pharmacist access under this admin pharmacy.</p>
          </div>
          <button type="button" className="btn-primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            + Add Pharmacist
          </button>
        </div>

        <label className="pharmacist-search">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && loadPharmacists()}
            placeholder="Search by name, email or phone"
          />
          <button type="button" onClick={loadPharmacists}>Search</button>
        </label>

        <div className="branch-table-wrap">
          <table className="branch-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Pharmacy</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading pharmacists...</td></tr> : null}
              {!loading && filtered.length ? filtered.map((pharmacist) => (
                <tr key={getId(pharmacist)}>
                  <td style={{ fontWeight: 600 }}>{getName(pharmacist)}</td>
                  <td>{pharmacist?.email || '-'}</td>
                  <td>{getPhone(pharmacist) || '-'}</td>
                  <td>{pharmacist?.pharmacy?.name || pharmacist?.pharmacyName || pharmacist?.branchName || 'Main Pharmacy'}</td>
                  <td>
                    <button
                      type="button"
                      className={`table-status-badge clickable ${isPharmacistActive(pharmacist) ? 'status-success' : 'status-danger'}`}
                      onClick={() => handleStatus(pharmacist)}
                      disabled={togglingId === getId(pharmacist)}
                      title={isPharmacistActive(pharmacist) ? 'Active — Click to Deactivate' : 'Inactive — Click to Activate'}
                      aria-label={`Status: ${getStatus(pharmacist)}. Click to toggle.`}
                      style={{
                        opacity: togglingId === getId(pharmacist) ? 0.6 : 1,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: isPharmacistActive(pharmacist) ? '#16a34a' : '#dc2626',
                        }}
                      />
                      {getStatus(pharmacist)}
                    </button>
                  </td>
                  <td className="pharmacist-actions">
                    <div className="admin-action-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button type="button" className="action-btn view" aria-label="View Details" title="View Details" onClick={() => openEdit(pharmacist)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      <button type="button" className="action-btn edit" aria-label="Edit Pharmacist" title="Edit Pharmacist" onClick={() => openEdit(pharmacist)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
                      </button>
                      <button type="button" className="action-btn" style={{ background: '#f3e8ff', color: '#9333ea', borderColor: '#e9d5ff' }} aria-label="Permissions" title="Permissions" onClick={() => openPermissions(pharmacist)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M15 4h4v4" /></svg>
                      </button>
                      <button type="button" className="action-btn" style={{ background: '#e0f2fe', color: '#0284c7', borderColor: '#bae6fd' }} aria-label="Assign Pharmacy" title="Assign Pharmacy" onClick={() => handleAssign(pharmacist)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      </button>
                      <button
                        type="button"
                        className={`action-btn status-toggle ${isPharmacistActive(pharmacist) ? 'is-active' : 'is-inactive'}`}
                        aria-label={isPharmacistActive(pharmacist) ? 'Deactivate Pharmacist' : 'Activate Pharmacist'}
                        title={isPharmacistActive(pharmacist) ? 'Active — Click to Deactivate' : 'Inactive — Click to Activate'}
                        disabled={togglingId === getId(pharmacist)}
                        onClick={() => handleStatus(pharmacist)}
                      >
                        {isPharmacistActive(pharmacist) ? (
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="6" width="20" height="12" rx="6" fill="#10b981" fillOpacity="0.2" />
                            <circle cx="16" cy="12" r="3.5" fill="currentColor" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="6" width="20" height="12" rx="6" fill="#ef4444" fillOpacity="0.12" />
                            <circle cx="8" cy="12" r="3.5" fill="currentColor" />
                          </svg>
                        )}
                      </button>
                      <button type="button" className="action-btn" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }} aria-label="Reset Password" title="Reset Password" onClick={() => setResetting(pharmacist)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      </button>
                      <button type="button" className="action-btn danger" aria-label="Delete Pharmacist" title="Delete Pharmacist" onClick={() => handleDelete(pharmacist)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : null}
              {!loading && !filtered.length ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>No pharmacists found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Permissions Modal */}
      {permissionsFor ? (
        <div className="sa-modal-backdrop" onClick={() => setPermissionsFor(null)}>
          <form className="sa-modal-card" onSubmit={handlePermissions} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Permissions — {getName(permissionsFor)}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setPermissionsFor(null)} style={{ background: 'none', border: 0, fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <div className="sa-modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {permissionKeys.map((key) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(permissions[key])}
                      onChange={(event) => setPermissions({ ...permissions, [key]: event.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span style={{ textTransform: 'capitalize', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{key}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sa-modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9' }}>
              <button type="button" className="btn-secondary" onClick={() => setPermissionsFor(null)}>Cancel</button>
              <button className="btn-primary" type="submit">Save Permissions</button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Reset Password Modal */}
      {resetting ? (
        <div className="sa-modal-backdrop" onClick={() => setResetting(null)}>
          <form className="sa-modal-card" onSubmit={handleResetPassword} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Reset Password — {getName(resetting)}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setResetting(null)} style={{ background: 'none', border: 0, fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <div className="sa-modal-body" style={{ padding: '20px' }}>
              <div className="pharmacist-form-field">
                <label htmlFor="temp-password">Temporary Password *</label>
                <div className="password-input-wrap">
                  <input
                    id="temp-password"
                    type={showTempPassword ? 'text' : 'password'}
                    value={temporaryPassword}
                    onChange={(event) => setTemporaryPassword(event.target.value)}
                    placeholder="Enter temporary password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowTempPassword((prev) => !prev)}
                    title={showTempPassword ? 'Hide password' : 'Show password'}
                    aria-label={showTempPassword ? 'Hide password' : 'Show password'}
                  >
                    <PasswordIcon visible={showTempPassword} />
                  </button>
                </div>
              </div>
            </div>
            <div className="sa-modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9' }}>
              <button type="button" className="btn-secondary" onClick={() => setResetting(null)}>Cancel</button>
              <button className="btn-primary" type="submit">Set Password</button>
            </div>
          </form>
        </div>
      ) : null}
    </AdminLayout>
  )
}

export default Users
