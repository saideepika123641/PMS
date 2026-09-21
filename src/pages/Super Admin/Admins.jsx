import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../../components/ToastProvider'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import {
  assignPharmacyAdmin,
  changePharmacyAdminStatus,
  createPharmacyAdmin,
  deletePharmacyAdmin,
  listAssignmentHospitals,
  listHospitalBranches,
  listPharmacyAdmins,
  resetPharmacyAdminPassword,
  updatePharmacyAdmin,
} from '../../config/api'
import './AdminsModern.css'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  hospitalId: '',
  branchId: '',
}

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.admins)) return response.data.admins
  if (Array.isArray(response?.data?.hospitals)) return response.data.hospitals
  if (Array.isArray(response?.data?.branches)) return response.data.branches
  if (Array.isArray(response?.admins)) return response.admins
  if (Array.isArray(response?.hospitals)) return response.hospitals
  if (Array.isArray(response?.branches)) return response.branches
  if (Array.isArray(response?.results)) return response.results
  return []
}

function getId(item) {
  return item?._id || item?.id || item?.adminId || item?.hospitalId || item?.branchId || item?.uuid
}

function getHospitalId(item) {
  return item?._id || item?.id || item?.hospitalId || item?.externalHospitalId || item?.uuid
}

function getBranchId(item) {
  return item?._id || item?.id || item?.branchId || item?.externalBranchId || item?.uuid
}

function getHospitalName(item) {
  return item?.name || item?.hospitalName || item?.title || item?.externalHospitalId || 'Hospital'
}

function getBranchName(item) {
  return item?.name || item?.branchName || item?.title || item?.externalBranchId || 'Branch'
}

function getName(item) {
  return item?.name || item?.fullName || item?.adminName || item?.email || 'Pharmacy Admin'
}

function getStatus(item) {
  const value = item?.status ?? item?.isActive
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive'
  return value || 'Active'
}

function Admins() {
  const { showToast } = useToast()
  const [admins, setAdmins] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [branches, setBranches] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 5
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [viewingAdmin, setViewingAdmin] = useState(null)
  const [assigningAdmin, setAssigningAdmin] = useState(null)
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

  async function loadHospitals() {
    try {
      const data = await listAssignmentHospitals()
      setHospitals(normalizeList(data))
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  useEffect(() => {
    if (didLoadInitialData.current) return
    didLoadInitialData.current = true

    loadAdmins()
    loadHospitals()
  }, [])

  async function loadBranches(hospitalId) {
    setBranches([])
    if (!hospitalId) return

    try {
      const data = await listHospitalBranches(hospitalId)
      setBranches(normalizeList(data))
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

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
      email: admin?.email || '',
      phone: admin?.phone || admin?.mobile || '',
      password: '',
      hospitalId: admin?.hospitalId || admin?.hospital?._id || admin?.hospital?.id || '',
      branchId: admin?.branchId || admin?.branch?._id || admin?.branch?.id || '',
    })
    loadBranches(admin?.hospitalId || admin?.hospital?._id || admin?.hospital?.id || '')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      ...(form.password ? { password: form.password } : {}),
      sendWelcomeEmail,
    }

    try {
      if (editingAdmin) {
        const data = await updatePharmacyAdmin(getId(editingAdmin), payload)
        if (form.hospitalId && form.branchId) {
          await assignPharmacyAdmin(getId(editingAdmin), {
            hospitalId: form.hospitalId,
            branchId: form.branchId,
          })
        }
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

  async function handleDelete(admin) {
    if (!window.confirm(`Delete ${getName(admin)}?`)) return

    try {
      const data = await deletePharmacyAdmin(getId(admin))
      showToast(data?.message || 'Admin deleted successfully.')
      await loadAdmins()
    } catch (error) {
      showToast(error.message, 'error')
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

  function openAssign(admin) {
    const hospitalId = admin?.hospitalId || admin?.hospital?._id || admin?.hospital?.id || ''
    setAssigningAdmin(admin)
    setForm({
      ...emptyForm,
      hospitalId,
      branchId: admin?.branchId || admin?.branch?._id || admin?.branch?.id || '',
    })
    loadBranches(hospitalId)
  }

  async function handleAssign(event) {
    event.preventDefault()

    try {
      const data = await assignPharmacyAdmin(getId(assigningAdmin), {
        hospitalId: form.hospitalId,
        branchId: form.branchId,
      })
      showToast(data?.message || 'Pharmacy assignment updated successfully.')
      setAssigningAdmin(null)
      setForm(emptyForm)
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
              Create Admin
            </button>
          </div>

          <div className="admins-toolbar">
            <label className="admins-table-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M16 16L21 21" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search admins by name, email, clinic, or role..." />
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
                <p>Manage administrator access for a clinic.</p>
              </div>

              <form className="admins-form" onSubmit={handleSubmit}>
                <div className="admins-form-grid">
                  <label className="admins-field">
                    <span>Full Name</span>
                    <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jane Smith" required />
                  </label>

                  <label className="admins-field">
                    <span>Email</span>
                    <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="superadmin@gmail.com" required />
                  </label>

                  <label className="admins-field">
                    <span>Phone</span>
                    <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="10-digit Indian mobile number" />
                  </label>

                  <label className="admins-field">
                    <span>Role</span>
                    <select value="Admin" readOnly>
                      <option value="Admin">Admin</option>
                    </select>
                  </label>

                  <label className="admins-field admins-field-wide">
                    <span>Assigned clinic</span>
                    <select value={form.hospitalId} onChange={(event) => {
                      setForm({ ...form, hospitalId: event.target.value, branchId: '' })
                      loadBranches(event.target.value)
                    }}>
                      <option value="">Select clinic</option>
                      {hospitals.map((hospital) => <option value={getHospitalId(hospital)} key={getHospitalId(hospital)}>{getHospitalName(hospital)}</option>)}
                    </select>
                  </label>

                </div>

                <div className="admins-toggle-row">
                  <div>
                    <strong>Send welcome email</strong>
                    <small>With login instructions</small>
                  </div>
                  <button
                    type="button"
                    className={`admins-toggle ${sendWelcomeEmail ? 'is-on' : ''}`}
                    aria-label="Toggle welcome email"
                    onClick={() => setSendWelcomeEmail((prev) => !prev)}
                  >
                    <span className="admins-toggle-knob" />
                  </button>
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
                  <th>Email</th>
                  <th>Assigned Clinic</th>
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
                    <td>{admin?.email || '-'}</td>
                    <td>
                      {admin?.hospital?.name || admin?.hospitalName ? (
                        <span className="admin-clinic-pill">
                          <span className="admin-clinic-dot">◉</span>
                          {admin?.hospital?.name || admin?.hospitalName}
                        </span>
                      ) : '-'}
                    </td>
                    <td>{admin?.phone || admin?.mobile || '-'}</td>
                    <td><span className={`admin-status ${String(getStatus(admin)).toLowerCase()}`}>{getStatus(admin)}</span></td>
                    <td>
                      <div className="admin-action-group">
                        <button type="button" className="admin-action-button view" aria-label="View admin" title="View admin" onClick={() => setViewingAdmin(admin)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <button type="button" className="admin-action-button edit" aria-label="Edit admin" title="Edit admin" onClick={() => openEdit(admin)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
                        </button>
                        <button type="button" className="admin-action-button assign" aria-label="Assign admin" title="Assign admin" onClick={() => openAssign(admin)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12l3 3 7-7" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        </button>
                        <button type="button" className="admin-action-button danger" aria-label="Delete admin" title="Delete admin" onClick={() => handleDelete(admin)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                        </button>
                      </div>
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
                  <span>{viewingAdmin?.phone || viewingAdmin?.mobile || '-'}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <span>{getStatus(viewingAdmin)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Assigned Clinic</label>
                  <span>{viewingAdmin?.hospital?.name || viewingAdmin?.hospitalName || '-'}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Assigned Branch</label>
                  <span>{viewingAdmin?.branch?.name || viewingAdmin?.branchName || '-'}</span>
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

      {assigningAdmin ? (
        <div className="admins-modal-backdrop" onClick={() => setAssigningAdmin(null)}>
          <div className="admins-modal-card small-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="admins-modal-header">
              <div className="admins-modal-title-wrap">
                <span className="admins-modal-icon">⎇</span>
                <div>
                  <h2>Assign Clinic</h2>
                </div>
              </div>
              <button type="button" className="admins-modal-close" onClick={() => setAssigningAdmin(null)} aria-label="Close">×</button>
            </div>
            <form className="admins-form" onSubmit={handleAssign}>
              <div className="admins-form-grid single-column">
                <label className="admins-field">
                  <span>Hospital</span>
                  <select value={form.hospitalId} onChange={(event) => {
                    setForm({ ...form, hospitalId: event.target.value, branchId: '' })
                    loadBranches(event.target.value)
                  }} required>
                    <option value="">Select hospital</option>
                    {hospitals.map((hospital) => <option value={getHospitalId(hospital)} key={getHospitalId(hospital)}>{getHospitalName(hospital)}</option>)}
                  </select>
                </label>
                <label className="admins-field">
                  <span>Branch</span>
                  <select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} disabled={!form.hospitalId} required>
                    <option value="">Select branch</option>
                    {branches.map((branch) => <option value={getBranchId(branch)} key={getBranchId(branch)}>{getBranchName(branch)}</option>)}
                  </select>
                </label>
              </div>
              <div className="admins-form-actions">
                <button type="button" className="admins-cancel-button" onClick={() => setAssigningAdmin(null)}>Cancel</button>
                <button type="submit" className="admins-submit-button">Assign</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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

