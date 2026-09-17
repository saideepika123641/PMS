import { useEffect, useMemo, useState } from 'react'
import { changeSuperAdminHospitalStatus, listAssignmentHospitals } from '../../config/api'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import './Clinics.css'

function Icon({ name }) {
  const paths = {
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
    select: <><path d="m5 12 4 4L19 6" /><rect x="3" y="3" width="18" height="18" rx="2" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
    map: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6.3 6.3l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7A2 2 0 0 1 22 16.9Z" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.hospitals)) return response.data.hospitals
  if (Array.isArray(response?.data?.results)) return response.data.results
  if (Array.isArray(response?.hospitals)) return response.hospitals
  if (Array.isArray(response?.results)) return response.results
  return []
}

function clinicName(clinic) {
  return clinic?.name || clinic?.clinicName || clinic?.hospitalName || clinic?.title || '-'
}

function clinicAddress(clinic) {
  return clinic?.address || clinic?.location || [clinic?.city, clinic?.state, clinic?.country].filter(Boolean).join(', ') || '-'
}

function clinicPhone(clinic) {
  return clinic?.phone || clinic?.mobile || clinic?.contactNumber || clinic?.contact || '-'
}

function clinicId(clinic) {
  return clinic?._id || clinic?.id || clinic?.hospitalId || clinic?.externalHospitalId
}

function clinicStatus(clinic) {
  const value = clinic?.status ?? clinic?.isActive
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive'
  return value || 'Active'
}

function Clinics() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const pageSize = 5

  useEffect(() => {
    let active = true

    async function loadClinics() {
      setLoading(true)
      setError('')

      try {
        const response = await listAssignmentHospitals()
        if (active) setClinics(normalizeList(response))
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load clinics.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadClinics()
    return () => {
      active = false
    }
  }, [])

  const filteredClinics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return clinics.filter((clinic) => {
      const matchesQuery = !normalizedQuery || [clinicName(clinic), clinicAddress(clinic), clinicPhone(clinic), clinic?.email].join(' ').toLowerCase().includes(normalizedQuery)
      const matchesStatus = statusFilter === 'All' || clinicStatus(clinic).toLowerCase() === statusFilter.toLowerCase()
      return matchesQuery && matchesStatus
    })
  }, [clinics, query, statusFilter])

  useEffect(() => setPage(1), [query, statusFilter])

async function toggleClinicStatus(clinic) {
    const id = clinicId(clinic)
    if (!id) return
    const nextStatus = clinicStatus(clinic).toLowerCase() === 'active' ? 'Inactive' : 'Active'
    try {
      await changeSuperAdminHospitalStatus(id, { status: nextStatus, isActive: nextStatus === 'Active' })
      setClinics((current) => current.map((item) => clinicId(item) === id ? { ...item, status: nextStatus, isActive: nextStatus === 'Active' } : item))
    } catch (requestError) {
      setError(requestError.message || 'Unable to change clinic status.')
    }
  }

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewingClinic, setViewingClinic] = useState(null)
  const [editingClinic, setEditingClinic] = useState(null)
  const [clinicForm, setClinicForm] = useState({ name: '', address: '', phone: '', email: '', status: 'Active' })

  function openCreate() {
    setClinicForm({ name: '', address: '', phone: '', email: '', status: 'Active' })
    setCreateModalOpen(true)
  }

  function openView(clinic) {
    setViewingClinic(clinic)
  }

  function openEdit(clinic) {
    setEditingClinic(clinic)
    setClinicForm({
      name: clinicName(clinic),
      address: clinicAddress(clinic) === '-' ? '' : clinicAddress(clinic),
      phone: clinicPhone(clinic) === '-' ? '' : clinicPhone(clinic),
      email: clinic?.email || '',
      status: clinicStatus(clinic)
    })
  }

  function handleCreate(e) {
    e.preventDefault()
    const newClinic = {
      _id: `clinic-${Date.now()}`,
      name: clinicForm.name,
      clinicName: clinicForm.name,
      address: clinicForm.address,
      phone: clinicForm.phone,
      email: clinicForm.email,
      status: clinicForm.status,
      isActive: clinicForm.status === 'Active'
    }
    setClinics((current) => [newClinic, ...current])
    setCreateModalOpen(false)
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    const id = clinicId(editingClinic)
    setClinics((current) => current.map((item) => {
      if (clinicId(item) === id) {
        return {
          ...item,
          name: clinicForm.name,
          clinicName: clinicForm.name,
          address: clinicForm.address,
          phone: clinicForm.phone,
          email: clinicForm.email,
          status: clinicForm.status,
          isActive: clinicForm.status === 'Active'
        }
      }
      return item
    }))
    setEditingClinic(null)
  }

  function handleDelete(clinic) {
    const name = clinicName(clinic)
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
    const id = clinicId(clinic)
    setClinics((current) => current.filter((item) => clinicId(item) !== id))
  }

  const pageCount = Math.max(1, Math.ceil(filteredClinics.length / pageSize))
  const visibleClinics = filteredClinics.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="super-admin-shell clinics-page">
      <SuperAdminSidebar activeLabel="Clinics" />
      <main className="super-admin-main">
        <SuperAdminTopbar onMenu={() => {}} />
        <section className="clinics-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1>Clinic Management</h1>
            <p>{filteredClinics.length} clinics found</p>
          </div>
          <button type="button" className="sa-btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>＋</span> Add Clinic
          </button>
        </section>
        <section className="clinics-panel">
          <div className="clinics-toolbar">
            <label className="clinics-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clinics by name, address, or email..." /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter clinics by status"><option>All</option><option>Active</option><option>Inactive</option></select>
          </div>
          <div className="clinics-table-wrap">
            <table className="clinics-table">
              <thead><tr><th>S.No</th><th>Clinic Name</th><th>Address</th><th>Contact Number</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="7">Loading clinics...</td></tr> : error ? <tr><td colSpan="7" className="clinics-error">{error}</td></tr> : visibleClinics.length ? visibleClinics.map((clinic, index) => { const status = clinicStatus(clinic); return <tr key={clinic?._id || clinic?.id || `${clinicName(clinic)}-${index}`}><td>{(page - 1) * pageSize + index + 1}</td><td><span className="clinic-name"><span className="clinic-avatar">{clinicName(clinic).slice(0, 1).toUpperCase()}</span>{clinicName(clinic)}</span></td><td><span className="clinic-with-icon"><Icon name="map" />{clinicAddress(clinic)}</span></td><td><span className="clinic-with-icon"><Icon name="phone" />{clinicPhone(clinic)}</span></td><td>{clinic?.email || '-'}</td><td><span className={`clinic-status ${status.toLowerCase()}`}>{status}</span></td><td><span className="clinic-actions"><button className="clinic-action-button view" type="button" aria-label={`View ${clinicName(clinic)}`} title={`View ${clinicName(clinic)}`} onClick={() => openView(clinic)}><Icon name="eye" /></button><button className="clinic-action-button edit" type="button" aria-label={`Edit ${clinicName(clinic)}`} title={`Edit ${clinicName(clinic)}`} onClick={() => openEdit(clinic)}><Icon name="edit" /></button><button className="clinic-action-button select" type="button" aria-label={`${status.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} ${clinicName(clinic)}`} title={`${status.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} ${clinicName(clinic)}`} onClick={() => toggleClinicStatus(clinic)}><Icon name="select" /></button><button className="clinic-action-button danger" type="button" aria-label={`Delete ${clinicName(clinic)}`} title={`Delete ${clinicName(clinic)}`} onClick={() => handleDelete(clinic)}><Icon name="trash" /></button></span></td></tr> }) : <tr><td colSpan="7">No clinics found.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="clinics-footer"><span>Showing {visibleClinics.length} of {filteredClinics.length} clinics</span><div><button type="button" onClick={() => setPage(1)} disabled={page === 1}>First</button><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Prev</button><strong>Page {page} of {pageCount}</strong><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>Next</button><button type="button" onClick={() => setPage(pageCount)} disabled={page === pageCount}>Last</button></div></footer>
        </section>
      </main>

      {createModalOpen && (
        <div className="sa-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <form className="sa-modal-card" onSubmit={handleCreate} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Add New Clinic</h2>
              <button type="button" className="sa-modal-close" onClick={() => setCreateModalOpen(false)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Clinic Name *</label>
                  <input required value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} placeholder="e.g. City Health Clinic" />
                </div>
                <div className="sa-modal-field">
                  <label>Contact Number *</label>
                  <input required value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })} placeholder="e.g. 9876543210" />
                </div>
                <div className="sa-modal-field">
                  <label>Email Address</label>
                  <input type="email" value={clinicForm.email} onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })} placeholder="clinic@example.com" />
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <select value={clinicForm.status} onChange={(e) => setClinicForm({ ...clinicForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="sa-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Address *</label>
                  <textarea required value={clinicForm.address} onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })} placeholder="Full address" />
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
              <button type="submit" className="sa-btn-primary">Create Clinic</button>
            </div>
          </form>
        </div>
      )}

      {viewingClinic && (
        <div className="sa-modal-backdrop" onClick={() => setViewingClinic(null)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Clinic Details: {clinicName(viewingClinic)}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setViewingClinic(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Clinic Name</label>
                  <span>{clinicName(viewingClinic)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Contact Number</label>
                  <span>{clinicPhone(viewingClinic)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Email Address</label>
                  <span>{viewingClinic?.email || '-'}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <span>{clinicStatus(viewingClinic)}</span>
                </div>
                <div className="sa-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <span>{clinicAddress(viewingClinic)}</span>
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setViewingClinic(null)}>Close</button>
              <button type="button" className="sa-btn-primary" onClick={() => { const cl = viewingClinic; setViewingClinic(null); openEdit(cl) }}>Edit Clinic</button>
            </div>
          </div>
        </div>
      )}

      {editingClinic && (
        <div className="sa-modal-backdrop" onClick={() => setEditingClinic(null)}>
          <form className="sa-modal-card" onSubmit={handleSaveEdit} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Edit Clinic</h2>
              <button type="button" className="sa-modal-close" onClick={() => setEditingClinic(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Clinic Name *</label>
                  <input required value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} />
                </div>
                <div className="sa-modal-field">
                  <label>Contact Number</label>
                  <input value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })} />
                </div>
                <div className="sa-modal-field">
                  <label>Email Address</label>
                  <input type="email" value={clinicForm.email} onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })} />
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <select value={clinicForm.status} onChange={(e) => setClinicForm({ ...clinicForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="sa-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <textarea value={clinicForm.address} onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setEditingClinic(null)}>Cancel</button>
              <button type="submit" className="sa-btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Clinics
