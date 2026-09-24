import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import RowActions from '../../components/RowActions'
import {
  assignPharmacistToAdminPharmacy,
  changePharmacistStatus,
  createPharmacist,
  deletePharmacist,
  getPharmacistPermissions,
  listPharmacyBranches,
  listPharmacists,
  resetPharmacistPassword,
  updatePharmacist,
  updatePharmacistPermissions,
} from '../../config/api'
import AdminLayout from './AdminLayout'

const emptyForm = { name: '', email: '', phone: '', password: '', branchId: '' }
const permissionKeys = ['prescriptions', 'dispensing', 'stock', 'reports']

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.pharmacists)) return response.data.pharmacists
  if (Array.isArray(response?.data?.branches)) return response.data.branches
  if (Array.isArray(response?.pharmacists)) return response.pharmacists
  if (Array.isArray(response?.branches)) return response.branches
  if (Array.isArray(response?.results)) return response.results
  return []
}

function getId(item) {
  return item?._id || item?.id || item?.pharmacistId || item?.uuid
}

function branchIdOf(item) {
  return item?._id || item?.id || item?.branchId || item?.BranchId || ''
}

function branchNameOf(item) {
  return item?.name || item?.branchName || item?.BranchName || item?.pharmacyName || item?.PharmacyName || 'Branch'
}

function readStoredJson(key) {
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}


function mainBranchFromPharmacy() {
  const assignment = readStoredJson('pharmacyAdminAssignment') || {}
  const user = readStoredJson('pharmacyAdminUser') || {}
  const pharmacy = assignment.pharmacy || user.pharmacy || {}
  const branchId = assignment.branchId || assignment.BranchId || assignment.branch?.id || assignment.branch?.branchId || user.branchId || user.BranchId || user.branch?.id || user.branch?.branchId
  const id = branchId
  const pharmacyName = assignment.pharmacyName || pharmacy.name || user.pharmacyName || user.pharmacy?.name || assignment.branchName || user.branchName
  if (!pharmacyName) return null
  return {
    id,
    branchId: id,
    name: pharmacyName,
    branchName: `${pharmacyName} - Main Branch`,
    pharmacyName,
    isMainBranch: true,
  }
}
function storedBranchId() {
  const working = sessionStorage.getItem('workingBranchId') || localStorage.getItem('workingBranchId')
  if (working) return working
  const assignment = readStoredJson('pharmacyAdminAssignment') || {}
  const user = readStoredJson('pharmacyAdminUser') || {}
  return assignment.branchId || assignment.BranchId || assignment.branch?.id || assignment.branch?.branchId || user.branchId || user.BranchId || user.branch?.id || user.branch?.branchId || ''
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
  const [loadError, setLoadError] = useState('')
  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(false)
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
  const mainBranch = useMemo(() => mainBranchFromPharmacy(), [])
  const branchOptions = useMemo(() => {
    const options = mainBranch ? [mainBranch, ...branches] : branches
    const seen = new Set()
    return options.filter((branch) => {
      const id = String(branchIdOf(branch) || '')
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [mainBranch, branches])

  useEffect(() => {
    if (location.pathname.endsWith('/add')) {
      setEditing(null)
      setShowPassword(false)
      setForm((prev) => ({ name: '', email: '', phone: '', password: '', branchId: prev.branchId || storedBranchId() }))
      setFormErrors({})
      setFormOpen(true)
      const timer = setTimeout(() => {
        setForm((prev) => (editing ? prev : { name: '', email: '', phone: '', password: '', branchId: prev.branchId || storedBranchId() }))
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
    setLoadError('')
    try {
      const response = await listPharmacists({ search: query })
      setPharmacists(normalizeList(response))
    } catch (error) {
      const message = error.message || 'Unable to load pharmacists.'
      setLoadError(message)
      if (!/View permission for User Management/i.test(message)) showToast(message, 'error')
      setPharmacists([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAddRoute) loadPharmacists()
  }, [isAddRoute])

  useEffect(() => {
    let mounted = true
    async function loadBranchesForForm() {
      if (!isAddRoute && !formOpen) return
      setBranchesLoading(true)
      try {
        const response = await listPharmacyBranches()
        const list = normalizeList(response)
        if (!mounted) return
        setBranches(list)
        setForm((prev) => {
          const existing = prev.branchId || storedBranchId()
          const fallback = existing || branchIdOf(mainBranchFromPharmacy()) || branchIdOf(list[0])
          return { ...prev, branchId: fallback ? String(fallback) : '' }
        })
      } catch (error) {
        if (mounted) showToast(error.message || 'Unable to load branches for pharmacist assignment.', 'error')
      } finally {
        if (mounted) setBranchesLoading(false)
      }
    }
    loadBranchesForForm()
    return () => { mounted = false }
  }, [isAddRoute, formOpen])
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
    setForm({ ...emptyForm, branchId: storedBranchId() })
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
      branchId: pharmacist?.branchId || pharmacist?.BranchId || pharmacist?.branch?.id || pharmacist?.branch?.branchId || storedBranchId(),
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
    setForm({ ...emptyForm, branchId: storedBranchId() })
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
    if (!editing && !form.branchId) {
      setFormErrors((current) => ({ ...current, branchId: 'Please create or choose a branch before creating a pharmacist.' }))
      showToast('Please create or choose a branch before creating a pharmacist.', 'error')
      setSaving(false)
      return
    }
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
      ...(form.branchId ? { branchId: Number(form.branchId), BranchId: Number(form.branchId) } : {}),
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
        activeLabel="Pharmacists"
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
            <button className="btn-primary pharmacist-header-submit" type="submit" form="pharmacist-create-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Pharmacist'}
            </button>
          </div>

          <form id="pharmacist-create-form" onSubmit={handleSave} noValidate autoComplete="off" className="pharmacist-screen-form">
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
                <label htmlFor="user-branch">Branch *</label>
                <select
                  id="user-branch"
                  name="pharmacist_branch"
                  value={form.branchId}
                  onChange={(event) => {
                    setForm({ ...form, branchId: event.target.value })
                    if (formErrors.branchId) setFormErrors({ ...formErrors, branchId: '' })
                  }}
                  className={formErrors.branchId ? 'has-error' : ''}
                  required
                >
                  <option value="">{branchesLoading ? 'Loading branches...' : branchOptions.length ? 'Select branch' : 'Create a sub branch first'}</option>
                  {branchOptions.map((branch) => {
                    const id = branchIdOf(branch)
                    const label = branch?.isMainBranch ? `${branchNameOf(branch)} - Main Branch` : `${branchNameOf(branch)} - Sub Branch`
                    return id ? <option key={id} value={id}>{label}</option> : null
                  })}
                </select>
                {formErrors.branchId && (
                  <span className="form-error-msg">{formErrors.branchId}</span>
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
    <AdminLayout activeLabel="Pharmacists" title="Manage Pharmacists" subtitle="Admin / Pharmacists">
      <section className="branch-panel pharmacist-panel">
        <div className="branch-panel-heading">
          <div>
            <h2>Pharmacists</h2>
            <p>{loadError || 'Manage pharmacist access under this admin pharmacy.'}</p>
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
                    <RowActions itemName={getName(pharmacist)} isActive={isPharmacistActive(pharmacist)} onView={() => openEdit(pharmacist)} onEdit={() => openEdit(pharmacist)} onStatus={() => handleStatus(pharmacist)} onDelete={() => handleDelete(pharmacist)} statusDisabled={togglingId === getId(pharmacist)} />
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












