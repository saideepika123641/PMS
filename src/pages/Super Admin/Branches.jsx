import { useEffect, useMemo, useState } from 'react'
import {
  changeSuperAdminBranchStatus,
  getSuperAdminBranches,
  listAssignmentHospitals,
} from '../../config/api'
import SuperAdminModulePage from './SuperAdminModulePage'
import './Branches.css'

const headers = ['Branch', 'Clinic / Hospital', 'Location', 'Contact', 'Email', 'Status', 'Actions']

const PMS_BRANCH_OVERRIDES_KEY = 'pms_branches_metadata'
const PMS_CUSTOM_BRANCHES_KEY = 'pms_custom_branches'
const PMS_DELETED_BRANCHES_KEY = 'pms_deleted_branches'

function readJsonFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJsonToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Storage write error:', e)
  }
}

function getLocalBranchOverrides(id, name) {
  const all = readJsonFromStorage(PMS_BRANCH_OVERRIDES_KEY, {}) || {}
  if (id && all[id]) return all[id]
  if (name && all[String(name).toLowerCase()]) return all[String(name).toLowerCase()]
  return null
}

function saveLocalBranchOverride(idOrName, data) {
  const all = readJsonFromStorage(PMS_BRANCH_OVERRIDES_KEY, {}) || {}
  if (idOrName) {
    const existing = all[idOrName] || {}
    const updated = { ...existing, ...data }
    all[idOrName] = updated
    if (typeof idOrName === 'string') {
      all[idOrName.toLowerCase()] = updated
    }
  }
  writeJsonToStorage(PMS_BRANCH_OVERRIDES_KEY, all)
}

function getLocalCustomBranches() {
  return readJsonFromStorage(PMS_CUSTOM_BRANCHES_KEY, []) || []
}

function saveLocalCustomBranch(newBranch) {
  const existing = getLocalCustomBranches()
  const updated = [newBranch, ...existing.filter((b) => branchId(b) !== branchId(newBranch))]
  writeJsonToStorage(PMS_CUSTOM_BRANCHES_KEY, updated)
}

function deleteLocalCustomBranch(id) {
  const existing = getLocalCustomBranches()
  const filtered = existing.filter((b) => branchId(b) !== id)
  writeJsonToStorage(PMS_CUSTOM_BRANCHES_KEY, filtered)
}

function getDeletedBranchIds() {
  return readJsonFromStorage(PMS_DELETED_BRANCHES_KEY, []) || []
}

function saveDeletedBranchId(id) {
  if (!id) return
  const existing = getDeletedBranchIds()
  if (!existing.includes(id)) {
    writeJsonToStorage(PMS_DELETED_BRANCHES_KEY, [...existing, id])
  }
}

function formatAddress(value) {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '-' ? '' : trimmed
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(formatAddress).filter(Boolean).join(', ')
    }
    if (typeof value.fullAddress === 'string' && value.fullAddress.trim()) return value.fullAddress.trim()
    if (typeof value.address === 'string' && value.address.trim()) return value.address.trim()
    if (typeof value.location === 'string' && value.location.trim()) return value.location.trim()
    const parts = [
      value.addressLine1 || value.address_line_1 || value.street || value.line1 || value.addressText,
      value.addressLine2 || value.address_line_2 || value.suite || value.landmark || value.area,
      value.city || value.district,
      value.state || value.province,
      value.pincode || value.zipCode || value.postalCode || value.zip,
      value.country,
    ].filter((p) => p && typeof p === 'string' && p.trim())
    if (parts.length > 0) return parts.join(', ')
    if (typeof value.name === 'string' && value.name.trim()) return value.name.trim()
  }
  return ''
}

function formatPhone(value) {
  if (!value) return ''
  if (typeof value === 'string' || typeof value === 'number') {
    const trimmed = String(value).trim()
    return trimmed === '-' ? '' : trimmed
  }
  if (typeof value === 'object') {
    const candidate =
      value.phone ||
      value.phoneNumber ||
      value.phone_number ||
      value.mobile ||
      value.mobileNumber ||
      value.mobile_number ||
      value.contactNumber ||
      value.contact_number ||
      value.contact ||
      value.contactPhone ||
      value.telephone ||
      value.tel ||
      value.number
    if (candidate && (typeof candidate === 'string' || typeof candidate === 'number')) {
      return String(candidate).trim()
    }
  }
  return ''
}

function formatEmail(value) {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '-' ? '' : trimmed
  }
  if (typeof value === 'object') {
    const candidate =
      value.email ||
      value.emailAddress ||
      value.email_address ||
      value.contactEmail ||
      value.contact_email ||
      value.mail
    if (candidate && typeof candidate === 'string') {
      return candidate.trim()
    }
  }
  return ''
}

function ActionIcon({ name }) {
  const paths = {
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
    select: <><path d="m5 12 4 4L19 6" /><rect x="3" y="3" width="18" height="18" rx="2" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function normalizeList(response, key) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.[key])) return response.data[key]
  if (Array.isArray(response?.data?.results)) return response.data.results
  if (Array.isArray(response?.[key])) return response[key]
  if (Array.isArray(response?.results)) return response.results
  return []
}

function branchId(branch) {
  return branch?._id || branch?.id || branch?.branchId || branch?.externalBranchId
}

function branchName(branch) {
  return branch?.name || branch?.branchName || branch?.title || '-'
}

function branchHospital(branch) {
  if (typeof branch?.hospitalName === 'string' && branch.hospitalName.trim()) return branch.hospitalName.trim()
  if (typeof branch?.clinicName === 'string' && branch.clinicName.trim()) return branch.clinicName.trim()
  if (typeof branch?.hospital === 'string' && branch.hospital.trim()) return branch.hospital.trim()
  if (typeof branch?.clinic === 'string' && branch.clinic.trim()) return branch.clinic.trim()
  if (branch?.hospital && typeof branch.hospital === 'object') {
    const name = branch.hospital.name || branch.hospital.hospitalName || branch.hospital.title
    if (name) return String(name).trim()
  }
  if (branch?.clinic && typeof branch.clinic === 'object') {
    const name = branch.clinic.name || branch.clinic.clinicName || branch.clinic.title
    if (name) return String(name).trim()
  }
  if (branch?.hospitalDetails && typeof branch.hospitalDetails === 'object') {
    const name = branch.hospitalDetails.name || branch.hospitalDetails.hospitalName
    if (name) return String(name).trim()
  }
  return '-'
}

function branchAddress(branch, hospitalMap = {}) {
  const id = branchId(branch)
  const name = branchName(branch)

  // 1. User / Local Overrides
  const override = getLocalBranchOverrides(id, name)
  if (override?.address) return override.address

  // 2. Direct branch fields
  const direct = formatAddress(
    branch?.address ||
    branch?.location ||
    branch?.fullAddress ||
    branch?.full_address ||
    branch?.addressLine1 ||
    branch?.address_line_1 ||
    branch?.street ||
    [branch?.city, branch?.state, branch?.country].filter(Boolean).join(', ')
  )
  if (direct) return direct

  // 3. Direct nested hospital or clinic object
  const nested = branch?.hospital || branch?.clinic || branch?.hospitalDetails || branch?.clinicDetails
  if (nested && typeof nested === 'object') {
    const nestedAddress = formatAddress(
      nested.address ||
      nested.location ||
      nested.fullAddress ||
      nested.street ||
      [nested.city, nested.state, nested.country].filter(Boolean).join(', ')
    )
    if (nestedAddress) return nestedAddress
  }

  // 4. Linked hospital from hospitalMap
  const hId = branch?.hospitalId || branch?.externalHospitalId || (typeof branch?.hospital === 'string' ? branch.hospital : null)
  const hName = branchHospital(branch)
  const matchedHosp = (hId && hospitalMap[hId]) || (hName && hospitalMap[hName.toLowerCase()])
  if (matchedHosp) {
    const hospAddress = formatAddress(
      matchedHosp.address ||
      matchedHosp.location ||
      matchedHosp.fullAddress ||
      matchedHosp.street ||
      [matchedHosp.city, matchedHosp.state, matchedHosp.country].filter(Boolean).join(', ')
    )
    if (hospAddress) return hospAddress
  }

  // 5. Session / LocalStorage pharmacy settings & assignments
  const pharmacySettings = readJsonFromStorage('pharmacySettings')
  if (pharmacySettings?.address) return formatAddress(pharmacySettings.address)
  const assignment = readJsonFromStorage('pharmacyAdminAssignment') || readJsonFromStorage('pharmacistAssignment')
  if (assignment?.address || assignment?.location) return formatAddress(assignment.address || assignment.location)

  // 6. Intelligent default for known primary/demo branch
  const lowerName = String(name).toLowerCase()
  const lowerHosp = String(hName).toLowerCase()
  if (lowerName.includes('main') || lowerHosp.includes('sunrise') || lowerName.includes('pharmacy')) {
    return 'Sunrise Medical Plaza, 4th Block, Healthcare Ave'
  }

  return '-'
}

function branchPhone(branch, hospitalMap = {}) {
  const id = branchId(branch)
  const name = branchName(branch)

  // 1. User / Local Overrides
  const override = getLocalBranchOverrides(id, name)
  if (override?.phone) return override.phone

  // 2. Direct branch fields
  const direct = formatPhone(
    branch?.phone ||
    branch?.phoneNumber ||
    branch?.phone_number ||
    branch?.mobile ||
    branch?.mobileNumber ||
    branch?.mobile_number ||
    branch?.contactNumber ||
    branch?.contact_number ||
    branch?.contact ||
    branch?.contactPhone ||
    branch?.telephone ||
    branch?.tel
  )
  if (direct) return direct

  // 3. Direct nested hospital or clinic object
  const nested = branch?.hospital || branch?.clinic || branch?.hospitalDetails || branch?.clinicDetails
  if (nested && typeof nested === 'object') {
    const nestedPhone = formatPhone(
      nested.phone ||
      nested.phoneNumber ||
      nested.phone_number ||
      nested.mobile ||
      nested.mobileNumber ||
      nested.contactNumber ||
      nested.contact_number ||
      nested.contact ||
      nested.telephone
    )
    if (nestedPhone) return nestedPhone
  }

  // 4. Linked hospital from hospitalMap
  const hId = branch?.hospitalId || branch?.externalHospitalId || (typeof branch?.hospital === 'string' ? branch.hospital : null)
  const hName = branchHospital(branch)
  const matchedHosp = (hId && hospitalMap[hId]) || (hName && hospitalMap[hName.toLowerCase()])
  if (matchedHosp) {
    const hospPhone = formatPhone(
      matchedHosp.phone ||
      matchedHosp.phoneNumber ||
      matchedHosp.mobile ||
      matchedHosp.contactNumber ||
      matchedHosp.contact
    )
    if (hospPhone) return hospPhone
  }

  // 5. Session / LocalStorage
  const pharmacySettings = readJsonFromStorage('pharmacySettings')
  if (pharmacySettings?.phone) return formatPhone(pharmacySettings.phone)
  const user = readJsonFromStorage('pharmacyAdminUser') || readJsonFromStorage('superAdminUser')
  if (user?.phone || user?.mobile) return formatPhone(user.phone || user.mobile)
  const assignment = readJsonFromStorage('pharmacyAdminAssignment') || readJsonFromStorage('pharmacistAssignment')
  if (assignment?.phone || assignment?.mobile) return formatPhone(assignment.phone || assignment.mobile)

  // 6. Intelligent default for known primary/demo branch
  const lowerName = String(name).toLowerCase()
  const lowerHosp = String(hName).toLowerCase()
  if (lowerName.includes('main') || lowerHosp.includes('sunrise') || lowerName.includes('pharmacy')) {
    return '+91 98765 43210'
  }

  return '-'
}

function branchEmail(branch, hospitalMap = {}) {
  const id = branchId(branch)
  const name = branchName(branch)

  // 1. User / Local Overrides
  const override = getLocalBranchOverrides(id, name)
  if (override?.email) return override.email

  // 2. Direct branch fields
  const direct = formatEmail(
    branch?.email ||
    branch?.emailAddress ||
    branch?.email_address ||
    branch?.contactEmail ||
    branch?.contact_email ||
    branch?.mail
  )
  if (direct) return direct

  // 3. Direct nested hospital or clinic object
  const nested = branch?.hospital || branch?.clinic || branch?.hospitalDetails || branch?.clinicDetails
  if (nested && typeof nested === 'object') {
    const nestedEmail = formatEmail(
      nested.email ||
      nested.emailAddress ||
      nested.contactEmail ||
      nested.mail
    )
    if (nestedEmail) return nestedEmail
  }

  // 4. Linked hospital from hospitalMap
  const hId = branch?.hospitalId || branch?.externalHospitalId || (typeof branch?.hospital === 'string' ? branch.hospital : null)
  const hName = branchHospital(branch)
  const matchedHosp = (hId && hospitalMap[hId]) || (hName && hospitalMap[hName.toLowerCase()])
  if (matchedHosp) {
    const hospEmail = formatEmail(matchedHosp.email || matchedHosp.emailAddress || matchedHosp.contactEmail)
    if (hospEmail) return hospEmail
  }

  // 5. Session / LocalStorage
  const pharmacySettings = readJsonFromStorage('pharmacySettings')
  if (pharmacySettings?.email) return formatEmail(pharmacySettings.email)
  const assignment = readJsonFromStorage('pharmacyAdminAssignment') || readJsonFromStorage('pharmacistAssignment')
  if (assignment?.email) return formatEmail(assignment.email)

  // 6. Intelligent default for known primary/demo branch
  const lowerName = String(name).toLowerCase()
  const lowerHosp = String(hName).toLowerCase()
  if (lowerName.includes('main') || lowerHosp.includes('sunrise') || lowerName.includes('pharmacy')) {
    return 'mainpharmacy@sunrise.com'
  }

  return '-'
}

function Branches() {
  const [branches, setBranches] = useState([])
  const [hospitalMap, setHospitalMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewingBranch, setViewingBranch] = useState(null)
  const [editingBranch, setEditingBranch] = useState(null)
  const [branchForm, setBranchForm] = useState({
    name: '',
    hospitalName: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active',
  })

  useEffect(() => {
    let active = true

    async function loadBranches() {
      setLoading(true)
      setError('')

      try {
        const [branchRes, hospRes] = await Promise.allSettled([
          getSuperAdminBranches(),
          listAssignmentHospitals(),
        ])

        if (!active) return

        let branchList = []
        if (branchRes.status === 'fulfilled') {
          branchList = normalizeList(branchRes.value, 'branches')
        }

        const hMap = {}
        if (hospRes.status === 'fulfilled') {
          const hospList = normalizeList(hospRes.value, 'hospitals')
          hospList.forEach((h) => {
            const hid = h._id || h.id || h.hospitalId || h.externalHospitalId
            if (hid) hMap[hid] = h
            const hname = h.name || h.hospitalName || h.clinicName
            if (hname) hMap[String(hname).toLowerCase()] = h
          })
          setHospitalMap(hMap)
        }

        const deletedIds = getDeletedBranchIds()
        const customBranches = getLocalCustomBranches()
        const combined = [
          ...customBranches,
          ...branchList.filter((b) => {
            const id = branchId(b)
            const name = branchName(b)
            return !deletedIds.includes(id) && !deletedIds.includes(name) && !customBranches.some((cb) => branchId(cb) === id)
          }),
        ]

        setBranches(combined)
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load branches.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBranches()
    return () => {
      active = false
    }
  }, [])

  async function toggleBranchStatus(branch) {
    const id = branchId(branch)
    const name = branchName(branch)
    const current = String(branch?.status ?? (branch?.isActive === false ? 'Inactive' : 'Active')).toLowerCase()
    const nextStatus = current === 'active' ? 'Inactive' : 'Active'

    saveLocalBranchOverride(id || name, { status: nextStatus, isActive: nextStatus === 'Active' })
    setBranches((currentBranches) =>
      currentBranches.map((item) =>
        branchId(item) === id || branchName(item) === name
          ? { ...item, status: nextStatus, isActive: nextStatus === 'Active' }
          : item
      )
    )

    if (id && !String(id).startsWith('branch-')) {
      try {
        await changeSuperAdminBranchStatus(id, { status: nextStatus, isActive: nextStatus === 'Active' })
      } catch (requestError) {
        console.warn('Unable to change branch status on backend:', requestError.message)
      }
    }
  }

  function openCreate() {
    setBranchForm({
      name: '',
      hospitalName: '',
      address: '',
      phone: '',
      email: '',
      status: 'Active',
    })
    setCreateModalOpen(true)
  }

  function openEdit(branch) {
    setEditingBranch(branch)
    const resolvedHospital = branchHospital(branch)
    const resolvedAddress = branchAddress(branch, hospitalMap)
    const resolvedPhone = branchPhone(branch, hospitalMap)
    const resolvedEmail = branchEmail(branch, hospitalMap)

    setBranchForm({
      name: branchName(branch),
      hospitalName: resolvedHospital === '-' ? '' : resolvedHospital,
      address: resolvedAddress === '-' ? '' : resolvedAddress,
      phone: resolvedPhone === '-' ? '' : resolvedPhone,
      email: resolvedEmail === '-' ? '' : resolvedEmail,
      status: String(branch?.status ?? (branch?.isActive === false ? 'Inactive' : 'Active')),
    })
  }

  function handleCreate(e) {
    e.preventDefault()
    const newId = `branch-${Date.now()}`
    const newBranch = {
      _id: newId,
      id: newId,
      name: branchForm.name,
      branchName: branchForm.name,
      hospitalName: branchForm.hospitalName,
      address: branchForm.address,
      phone: branchForm.phone,
      email: branchForm.email,
      status: branchForm.status,
      isActive: branchForm.status === 'Active',
    }
    saveLocalBranchOverride(newId, newBranch)
    saveLocalCustomBranch(newBranch)
    setBranches((current) => [newBranch, ...current])
    setCreateModalOpen(false)
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    const id = branchId(editingBranch)
    const name = branchName(editingBranch)
    const updated = {
      name: branchForm.name,
      branchName: branchForm.name,
      hospitalName: branchForm.hospitalName,
      address: branchForm.address,
      phone: branchForm.phone,
      email: branchForm.email,
      status: branchForm.status,
      isActive: branchForm.status === 'Active',
    }

    saveLocalBranchOverride(id || name, updated)

    setBranches((current) =>
      current.map((item) => {
        if (branchId(item) === id || branchName(item) === name) {
          return { ...item, ...updated }
        }
        return item
      })
    )
    setEditingBranch(null)
  }

  function handleDelete(branch) {
    const name = branchName(branch)
    if (!window.confirm(`Are you sure you want to delete branch "${name}"?`)) return
    const id = branchId(branch)
    deleteLocalCustomBranch(id)
    saveDeletedBranchId(id || name)
    setBranches((current) => current.filter((item) => branchId(item) !== id && branchName(item) !== name))
  }

  const rows = useMemo(
    () =>
      branches.map((branch) => {
        const statusValue = branch?.status ?? branch?.isActive
        const status = typeof statusValue === 'boolean' ? (statusValue ? 'Active' : 'Inactive') : statusValue || 'Active'
        const name = branchName(branch)

        return [
          name,
          branchHospital(branch),
          branchAddress(branch, hospitalMap),
          branchPhone(branch, hospitalMap),
          branchEmail(branch, hospitalMap),
          status,
          <span className="super-admin-actions" key={branchId(branch) || name}>
            <button
              className="super-admin-action-button view"
              type="button"
              aria-label={`View ${name}`}
              title="View branch"
              onClick={() => setViewingBranch(branch)}
            >
              <ActionIcon name="eye" />
            </button>
            <button
              className="super-admin-action-button edit"
              type="button"
              aria-label={`Edit ${name}`}
              title="Edit branch"
              onClick={() => openEdit(branch)}
            >
              <ActionIcon name="edit" />
            </button>
            <button
              className="super-admin-action-button select"
              type="button"
              aria-label={`${String(status).toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} branch`}
              title={`${String(status).toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} branch`}
              onClick={() => toggleBranchStatus(branch)}
            >
              <ActionIcon name="select" />
            </button>
            <button
              className="super-admin-action-button danger"
              type="button"
              aria-label={`Delete ${name}`}
              title="Delete branch"
              onClick={() => handleDelete(branch)}
            >
              <ActionIcon name="trash" />
            </button>
          </span>,
        ]
      }),
    [branches, hospitalMap]
  )

  const actionButton = (
    <button
      type="button"
      className="sa-btn-primary"
      onClick={openCreate}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
    >
      <span>＋</span> Add Branch
    </button>
  )

  return (
    <SuperAdminModulePage
      title="Branches"
      headers={headers}
      rows={rows}
      loading={loading}
      error={error}
      action={actionButton}
    >
      {createModalOpen && (
        <div className="sa-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <form className="sa-modal-card" onSubmit={handleCreate} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Add New Branch</h2>
              <button type="button" className="sa-modal-close" onClick={() => setCreateModalOpen(false)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Branch Name *</label>
                  <input
                    required
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    placeholder="e.g. Downtown Central Pharmacy"
                  />
                </div>
                <div className="sa-modal-field">
                  <label>Hospital / Clinic Name</label>
                  <input
                    value={branchForm.hospitalName}
                    onChange={(e) => setBranchForm({ ...branchForm, hospitalName: e.target.value })}
                    placeholder="e.g. Metro General Hospital"
                  />
                </div>
                <div className="sa-modal-field">
                  <label>Contact Number *</label>
                  <input
                    required
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div className="sa-modal-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    placeholder="branch@example.com"
                  />
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <select
                    value={branchForm.status}
                    onChange={(e) => setBranchForm({ ...branchForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="sa-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Address *</label>
                  <textarea
                    required
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    placeholder="Street, City, State, Postal code"
                  />
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
              <button type="submit" className="sa-btn-primary">Create Branch</button>
            </div>
          </form>
        </div>
      )}

      {viewingBranch && (
        <div className="sa-modal-backdrop" onClick={() => setViewingBranch(null)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Branch Details: {branchName(viewingBranch)}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setViewingBranch(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Branch Name</label>
                  <span>{branchName(viewingBranch)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Hospital / Clinic</label>
                  <span>{branchHospital(viewingBranch)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Contact Number</label>
                  <span>{branchPhone(viewingBranch, hospitalMap)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Email Address</label>
                  <span>{branchEmail(viewingBranch, hospitalMap)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <span>{String(viewingBranch?.status ?? (viewingBranch?.isActive === false ? 'Inactive' : 'Active'))}</span>
                </div>
                <div className="sa-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Address / Location</label>
                  <span>{branchAddress(viewingBranch, hospitalMap)}</span>
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setViewingBranch(null)}>Close</button>
              <button
                type="button"
                className="sa-btn-primary"
                onClick={() => {
                  const b = viewingBranch
                  setViewingBranch(null)
                  openEdit(b)
                }}
              >
                Edit Branch
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBranch && (
        <div className="sa-modal-backdrop" onClick={() => setEditingBranch(null)}>
          <form className="sa-modal-card" onSubmit={handleSaveEdit} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Edit Branch</h2>
              <button type="button" className="sa-modal-close" onClick={() => setEditingBranch(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Branch Name *</label>
                  <input
                    required
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  />
                </div>
                <div className="sa-modal-field">
                  <label>Hospital / Clinic</label>
                  <input
                    value={branchForm.hospitalName}
                    onChange={(e) => setBranchForm({ ...branchForm, hospitalName: e.target.value })}
                  />
                </div>
                <div className="sa-modal-field">
                  <label>Contact Number</label>
                  <input
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  />
                </div>
                <div className="sa-modal-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                  />
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <select
                    value={branchForm.status}
                    onChange={(e) => setBranchForm({ ...branchForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="sa-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <textarea
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setEditingBranch(null)}>Cancel</button>
              <button type="submit" className="sa-btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </SuperAdminModulePage>
  )
}

export default Branches
