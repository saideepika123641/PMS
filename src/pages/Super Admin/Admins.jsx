import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../../components/ToastProvider'
import RowActions from '../../components/RowActions'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import {  changePharmacyAdminStatus,
  createPharmacyAdmin,  getAddressByPincode,  getPharmacyAdmin,  listPharmacyAdmins,
  listSuperAdminRoleDropdown,
  resetPharmacyAdminPassword,
  updatePharmacyAdmin,
} from '../../config/api'
import './AdminsModern.css'

const emptyForm = {
  name: '',
  pharmacyName: '',
  email: '',
  mobileNumber: '',
  pharmacyAddress: '',
  pharmacyContactNumber: '',
  pharmacyEmail: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  pharmacyPermissionRoleId: '',
  isActive: true,
}

function unwrapAdmin(response) {
  return response?.admin || response?.data?.admin || response?.data || response
}

function normalizeList(response) {
  if (Array.isArray(response)) return response.map(unwrapAdmin)
  if (Array.isArray(response?.data)) return response.data.map(unwrapAdmin)
  if (Array.isArray(response?.data?.admins)) return response.data.admins.map(unwrapAdmin)
  if (Array.isArray(response?.data?.hospitals)) return response.data.hospitals
  if (Array.isArray(response?.data?.branches)) return response.data.branches
  if (Array.isArray(response?.admins)) return response.admins.map(unwrapAdmin)
  if (Array.isArray(response?.hospitals)) return response.hospitals
  if (Array.isArray(response?.branches)) return response.branches
  if (Array.isArray(response?.results)) return response.results
  return []
}

function getId(item) {
  return item?._id || item?.id || item?.adminId || item?.hospitalId || item?.branchId || item?.uuid
}

function getName(item) {
  return item?.name || item?.fullName || item?.adminName || item?.email || 'Pharmacy Admin'
}
function getValue(item, keys, fallback = '-') {
  return keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback
}

function getNestedValue(item, paths, fallback = '-') {
  for (const path of paths) {
    const value = path.split('.').reduce((source, key) => source?.[key], item)
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

function displayValue(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value.name || value.pharmacyName || value.address || fallback
  return value
}

function getPharmacyName(item) {
  const admin = unwrapAdmin(item)
  return displayValue(getNestedValue(admin, ['pharmacyName', 'PharmacyName', 'pharmacy.name', 'pharmacy.pharmacyName', 'hospitalName']))
}

function getPharmacyAddress(item) {
  const admin = unwrapAdmin(item)
  return displayValue(getNestedValue(admin, ['pharmacyAddress', 'PharmacyAddress', 'pharmacy.address', 'pharmacy.pharmacyAddress', 'address']))
}

function getPharmacyContact(item) {
  const admin = unwrapAdmin(item)
  return displayValue(getNestedValue(admin, ['pharmacyContactNumber', 'PharmacyContactNumber', 'pharmacy.contactNumber', 'pharmacy.pharmacyContactNumber', 'pharmacy.phone', 'contactNumber']))
}

function getPharmacyEmail(item) {
  const admin = unwrapAdmin(item)
  return displayValue(getNestedValue(admin, ['pharmacyEmail', 'PharmacyEmail', 'pharmacy.email', 'pharmacy.pharmacyEmail']))
}

function getMobileNumber(item) {
  const admin = unwrapAdmin(item)
  return getValue(admin, ['mobileNumber', 'MobileNumber', 'phone', 'mobile'])
}

function getLocation(item) {
  const admin = unwrapAdmin(item)
  return [getValue(admin, ['city', 'City'], ''), getValue(admin, ['state', 'State'], ''), getValue(admin, ['country', 'Country'], ''), getValue(admin, ['postalCode', 'PostalCode'], '')].filter(Boolean).join(', ') || '-'
}

function rolePayloadValue(value) {
  if (value === '') return undefined
  return /^\d+$/.test(String(value)) ? Number(value) : value
}
function getStatus(item) {
  const value = item?.status ?? item?.isActive
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive'
  return value || 'Active'
}
function firstAddressValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

function normalizePincodeAddress(response) {
  const source = response?.data?.address || response?.data || response?.address || response?.result || response || {}
  const first = Array.isArray(source) ? source[0] || {} : source
  return {
    city: firstAddressValue(first, ['area', 'Area', 'city', 'City', 'taluk', 'Taluk', 'name', 'Name']),
    district: firstAddressValue(first, ['district', 'District']),
    state: firstAddressValue(first, ['state', 'State', 'province', 'Province']),
    country: firstAddressValue(first, ['country', 'Country']),
  }
}
function Admins() {
  const { showToast } = useToast()
  const [admins, setAdmins] = useState([])
  const [roleOptions, setRoleOptions] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 5
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [editingAdmin, setEditingAdmin] = useState(null)
  const [viewingAdmin, setViewingAdmin] = useState(null)
  const [resettingAdmin, setResettingAdmin] = useState(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const didLoadInitialData = useRef(false)

  const filteredAdmins = useMemo(() => {
    const value = query.trim().toLowerCase()
    return admins.filter((admin) => {
      const matchesQuery = !value || JSON.stringify(admin).toLowerCase().includes(value)
      const matchesStatus = statusFilter === 'All' || String(getStatus(admin)).toLowerCase() === statusFilter.toLowerCase()
      return matchesQuery && matchesStatus
    })
  }, [admins, query, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filteredAdmins.length / pageSize))
  const visibleAdmins = filteredAdmins.slice((page - 1) * pageSize, page * pageSize)

  async function loadRoleOptions() {
    try {
      const response = await listSuperAdminRoleDropdown()
      const options = Array.isArray(response) ? response : response?.data?.roles || response?.data || response?.roles || response?.items || []
      setRoleOptions(Array.isArray(options) ? options : [])
    } catch {
      setRoleOptions([])
    }
  }
  async function loadAdmins() {
    setLoading(true)
    try {
      const data = await listPharmacyAdmins({ search: query })
      setAdmins(normalizeList(data))
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (didLoadInitialData.current) return
    didLoadInitialData.current = true

    loadAdmins()
    loadRoleOptions()
  }, [])

  function openCreate() {
    setCreateOpen(true)
    setEditingAdmin(null)
    setForm(emptyForm)
  }

  function closeEditor() {
    setCreateOpen(false)
    setEditingAdmin(null)
    setForm(emptyForm)
  }

  function openEdit(admin) {
    setCreateOpen(false)
    setEditingAdmin(admin)
    setForm({
      name: getName(admin),
      pharmacyName: getValue(admin, ['pharmacyName', 'PharmacyName'], ''),
      email: admin?.email || '',
      mobileNumber: getValue(admin, ['mobileNumber', 'MobileNumber', 'phone', 'mobile'], ''),
      pharmacyAddress: getPharmacyAddress(admin) === '-' ? '' : getPharmacyAddress(admin),
      pharmacyContactNumber: getPharmacyContact(admin) === '-' ? '' : getPharmacyContact(admin),
      pharmacyEmail: getPharmacyEmail(admin) === '-' ? '' : getPharmacyEmail(admin),
      city: getValue(admin, ['city', 'City'], ''),
      state: getValue(admin, ['state', 'State'], ''),
      country: getValue(admin, ['country', 'Country'], ''),
      postalCode: getValue(admin, ['postalCode', 'PostalCode'], ''),
      pharmacyPermissionRoleId: getValue(admin, ['pharmacyPermissionRoleId', 'PharmacyPermissionRoleId'], ''),
      isActive: String(getStatus(admin)).toLowerCase() === 'active',
    })
  }
  async function handlePostalCodeChange(value) {
    setForm((current) => ({ ...current, postalCode: value }))
    const pincode = String(value || '').replace(/\D/g, '')
    if (pincode.length !== 6) return

    try {
      const response = await getAddressByPincode(pincode)
      const address = normalizePincodeAddress(response)
      setForm((current) => ({
        ...current,
        postalCode: value,
        city: address.city || address.district || current.city,
        state: address.state || current.state,
        country: address.country || current.country,
      }))
    } catch (error) {
      showToast(error.message || 'Unable to fetch address for this pincode.', 'error')
    }
  }
  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name,
      pharmacyName: form.pharmacyName,
      email: form.email,
      mobileNumber: form.mobileNumber,
      pharmacyAddress: form.pharmacyAddress,
      pharmacyContactNumber: form.pharmacyContactNumber,
      pharmacyEmail: form.pharmacyEmail,
      city: form.city,
      state: form.state,
      country: form.country,
      postalCode: form.postalCode,
      pharmacyPermissionRoleId: rolePayloadValue(form.pharmacyPermissionRoleId),
      ...(editingAdmin ? { isActive: form.isActive } : {}),
    }
    try {
      if (editingAdmin) {
        const data = await updatePharmacyAdmin(getId(editingAdmin), payload)
        showToast(data?.message || 'Admin updated successfully.')
      } else {
        const data = await createPharmacyAdmin(payload)
        showToast(data?.message || 'Admin created successfully.')
      }

      closeEditor()
      await loadAdmins()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function openView(admin) {
    const adminId = getId(admin)
    if (!adminId) {
      setViewingAdmin(unwrapAdmin(admin))
      return
    }

    try {
      const response = await getPharmacyAdmin(adminId)
      setViewingAdmin(unwrapAdmin(response))
    } catch (error) {
      showToast(error.message || 'Unable to load admin details.', 'error')
      setViewingAdmin(unwrapAdmin(admin))
    }
  }
  async function handleStatus(admin) {
    const nextStatus = String(getStatus(admin)).toLowerCase() === 'active' ? 'inactive' : 'active'

    try {
      const data = await changePharmacyAdminStatus(getId(admin), { status: nextStatus })
      showToast(data?.message || 'Admin status updated successfully.')
      await loadAdmins()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault()

    try {
      const data = await resetPharmacyAdminPassword(getId(resettingAdmin), {
        temporaryPassword,
        password: temporaryPassword,
      })
      showToast(data?.message || 'Temporary password set successfully.')
      setResettingAdmin(null)
      setTemporaryPassword('')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  return (
    <div className={`admins-page-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
      <SuperAdminSidebar activeLabel="Admins" />

      <main className="admins-main">
        <SuperAdminTopbar onMenu={() => setSidebarOpen((value) => !value)} />

        <section className="admins-content">
          <div className="admins-section-header">
            <div>
              <h1>Admin Management</h1>
              <p>{filteredAdmins.length} admins found</p>
            </div>
            <button type="button" className="admins-primary-button" onClick={openCreate}>
              <span>＋</span>
              Create Pharmacy Admin
            </button>
          </div>

          <div className="admins-toolbar">
            <label className="admins-table-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M16 16L21 21" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search admins, pharmacy, city, or email..." />
            </label>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="admins-filter-button"
                onClick={() => setFilterDropdownOpen((prev) => !prev)}
                aria-label="Filter admins by status"
              >
                Status: {statusFilter}
                <span>▾</span>
              </button>
              {filterDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    background: '#fff',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    minWidth: '130px',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {['All', 'Active', 'Inactive'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option)
                        setFilterDropdownOpen(false)
                      }}
                      style={{
                        border: 0,
                        background: statusFilter === option ? '#eff6ff' : 'transparent',
                        color: statusFilter === option ? '#2563eb' : '#334155',
                        fontWeight: statusFilter === option ? 700 : 500,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(createOpen || editingAdmin) ? (
            <div className="admins-create-panel" aria-label={editingAdmin ? 'Edit admin form' : 'Create admin form'}>
              <div className="admins-form-header">
                <h2>{editingAdmin ? 'Edit Admin' : 'Create new admin'}</h2>
                <p>Create pharmacy and pharmacy admin access together.</p>
              </div>

              <form className="admins-form" onSubmit={handleSubmit}>
                <div className="admins-form-grid">
                  <label className="admins-field">
                    <span>Name</span>
                    <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Admin name" required />
                  </label>

                  <label className="admins-field">
                    <span>Pharmacy Name</span>
                    <input value={form.pharmacyName} onChange={(event) => setForm({ ...form, pharmacyName: event.target.value })} placeholder="Pharmacy name" required />
                  </label>

                  <label className="admins-field">
                    <span>Email</span>
                    <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@example.com" required />
                  </label>

                  <label className="admins-field">
                    <span>Mobile Number</span>
                    <input value={form.mobileNumber} onChange={(event) => setForm({ ...form, mobileNumber: event.target.value })} placeholder="Mobile number" />
                  </label>

                  <label className="admins-field">
                    <span>Pharmacy Contact Number</span>
                    <input value={form.pharmacyContactNumber} onChange={(event) => setForm({ ...form, pharmacyContactNumber: event.target.value })} placeholder="Contact number" />
                  </label>

                  <label className="admins-field">
                    <span>Pharmacy Email</span>
                    <input type="email" value={form.pharmacyEmail} onChange={(event) => setForm({ ...form, pharmacyEmail: event.target.value })} placeholder="pharmacy@example.com" />
                  </label>

                  <label className="admins-field admins-field-wide">
                    <span>Pharmacy Address</span>
                    <input value={form.pharmacyAddress} onChange={(event) => setForm({ ...form, pharmacyAddress: event.target.value })} placeholder="Pharmacy address" />
                  </label>

                  <label className="admins-field">
                    <span>City</span>
                    <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="City" />
                  </label>

                  <label className="admins-field">
                    <span>State</span>
                    <input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} placeholder="State" />
                  </label>

                  <label className="admins-field">
                    <span>Country</span>
                    <input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="Country" />
                  </label>

                  <label className="admins-field">
                    <span>Postal Code</span>
                    <input value={form.postalCode} onChange={(event) => handlePostalCodeChange(event.target.value)} placeholder="Postal code" />
                  </label>
                  <label className="admins-field">
                    <span>Permission Role ID</span>
                    <select value={form.pharmacyPermissionRoleId} onChange={(event) => setForm({ ...form, pharmacyPermissionRoleId: event.target.value })}><option value="">Select role</option>{roleOptions.map((role) => <option key={role._id || role.id || role.roleId} value={role._id || role.id || role.roleId}>{role.name || role.roleName || role.label}</option>)}</select>
                  </label>

                  {editingAdmin ? (
                    <label className="admins-field">
                      <span>Access Status</span>
                      <select value={form.isActive ? 'true' : 'false'} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </label>
                  ) : null}
                </div>

                <div className="admins-form-actions">
                  <button type="button" className="admins-cancel-button" onClick={closeEditor}>Cancel</button>
                  <button type="submit" className="admins-submit-button" disabled={saving}>
                    {saving ? 'Saving...' : editingAdmin ? 'Save Admin' : 'Create admin'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          <div className="admins-table-card">
            <table className="admins-table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Name</th>
                  <th>Pharmacy Name</th>
                  <th>Email</th>
                  <th>Mobile Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="admins-empty-cell">Loading admins...</td></tr>
                ) : visibleAdmins.length ? visibleAdmins.map((admin, index) => (
                  <tr key={getId(admin)}>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td className="admin-name-cell">
                      <span className="admin-avatar">{getName(admin).split(' ').slice(0,2).map((part) => part.charAt(0)).join('').slice(0,2).toUpperCase() || 'A'}</span>
                      {getName(admin)}
                    </td>
                    <td>{getPharmacyName(admin)}</td>
                    <td>{admin?.email || '-'}</td>
                    <td>{getMobileNumber(admin)}</td>
                    <td><span className={`admin-status ${String(getStatus(admin)).toLowerCase()}`}>{getStatus(admin)}</span></td>
                    <td>
                      <RowActions itemName={getName(admin)} isActive={String(getStatus(admin)).toLowerCase() === 'active'} onView={() => openView(admin)} onEdit={() => openEdit(admin)} onStatus={() => handleStatus(admin)} />
                    </td>
                  </tr>
                )) : (
                  <tr><td className="admins-empty-cell" colSpan="7">No pharmacy admins found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="admins-pagination-row">
            <span>Showing {visibleAdmins.length} of {filteredAdmins.length} admins</span>
            <div className="admins-pagination">
              <button type="button" onClick={() => setPage(1)} disabled={page === 1}>First</button>
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1)
                .map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={pageNum === page ? 'is-current' : ''}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next</button>
              <button type="button" onClick={() => setPage(pageCount)} disabled={page === pageCount}>Last</button>
            </div>
          </div>
        </section>
      </main>

      {viewingAdmin && (
        <div className="sa-modal-backdrop" onClick={() => setViewingAdmin(null)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Admin Details: {getName(viewingAdmin)}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setViewingAdmin(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Full Name</label>
                  <span>{getName(viewingAdmin)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Email Address</label>
                  <span>{viewingAdmin?.email || '-'}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Mobile Number</label>
                  <span>{getMobileNumber(viewingAdmin)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <span>{getStatus(viewingAdmin)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Pharmacy Name</label>
                  <span>{getPharmacyName(viewingAdmin)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Pharmacy Address</label>
                  <span>{getPharmacyAddress(viewingAdmin)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Pharmacy Contact</label>
                  <span>{getPharmacyContact(viewingAdmin)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Pharmacy Email</label>
                  <span>{getPharmacyEmail(viewingAdmin)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Location</label>
                  <span>{getLocation(viewingAdmin)}</span>
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setViewingAdmin(null)}>Close</button>
              <button
                type="button"
                className="sa-btn-primary"
                onClick={() => {
                  const a = viewingAdmin
                  setViewingAdmin(null)
                  openEdit(a)
                }}
              >
                Edit Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {resettingAdmin ? (
        <div className="admins-modal-backdrop" onClick={() => setResettingAdmin(null)}>
          <div className="admins-modal-card small-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="admins-modal-header">
              <div className="admins-modal-title-wrap">
                <span className="admins-modal-icon">✦</span>
                <div>
                  <h2>Reset Password</h2>
                </div>
              </div>
              <button type="button" className="admins-modal-close" onClick={() => setResettingAdmin(null)} aria-label="Close">×</button>
            </div>
            <form className="admins-form" onSubmit={handleResetPassword}>
              <div className="admins-form-grid single-column">
                <label className="admins-field">
                  <span>Temporary Password</span>
                  <input type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} required />
                </label>
              </div>
              <div className="admins-form-actions">
                <button type="button" className="admins-cancel-button" onClick={() => setResettingAdmin(null)}>Cancel</button>
                <button type="submit" className="admins-submit-button">Set Password</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Admins






