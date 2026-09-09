import { useEffect, useState, useMemo } from 'react'
import { useToast } from '../../components/ToastProvider'
import AdminLayout from './AdminLayout'
import { 
  cancelDoctorPrescription, 
  completeDoctorPrescription, 
  createManualPharmacyPrescription, 
  getDoctorPrescription, 
  updateDoctorPrescription,
  getPharmacyPrescriptions,
  getPharmacyAdminDashboard} from '../../config/api'
import './Prescriptions.css'

const normalizeList = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.prescriptions)) return response.prescriptions
  return []
}

function getId(item, index) {
  return item?._id || item?.id || item?.prescriptionId || item?.rxNo || `${index}`
}

export default function Prescriptions() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  
  // Modal states
  const [viewingItem, setViewingItem] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  
  // Dashboard summaries
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  })

  // Create Form State
  const [createForm, setCreateForm] = useState({
    patientName: '',
    doctorName: '',
    medicineName: '',
    dosage: '1 tablet',
    frequency: 'Once Daily',
    duration: '5 days',
    quantity: '5',
    instructions: 'Take after meals'
  })

  // Edit Form State
  const [editForm, setEditForm] = useState({
    id: '',
    patientName: '',
    doctorName: '',
    medicineName: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    instructions: '',
    status: 'Pending'
  })

  async function loadSummaryMetrics() {
    try {
      const response = await getPharmacyAdminDashboard()
      const data = response?.data || response || {}
      setSummary({
        total: Number(data?.totalPrescriptions || data?.prescriptionsCount || 0),
        pending: Number(data?.pendingPrescriptions || data?.pendingPrescriptionsCount || 0),
        inProgress: Number(data?.inProgressPrescriptions || data?.dispensedCount || 0),
        completed: Number(data?.completedPrescriptions || data?.completedCount || 0),
        cancelled: Number(data?.cancelledPrescriptions || data?.cancelledCount || 0)
      })
    } catch (e) {
      console.log('Unable to load prescription metrics:', e.message)
    }
  }

  async function refresh() {
    setLoading(true)
    try {
      const response = await getPharmacyPrescriptions()
      const list = normalizeList(response)
      setItems(list)
      // Recalculate summary totals locally if dashboard is offline
      if (list.length > 0) {
        setSummary(prev => ({
          ...prev,
          total: list.length,
          pending: list.filter(p => String(p.status || 'pending').toLowerCase() === 'pending').length,
          inProgress: list.filter(p => String(p.status).toLowerCase() === 'in progress' || String(p.status).toLowerCase() === 'dispensed').length,
          completed: list.filter(p => String(p.status).toLowerCase() === 'completed').length,
          cancelled: list.filter(p => String(p.status).toLowerCase() === 'cancelled').length
        }))
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummaryMetrics()
    refresh()
  }, [])

  // Filtered prescription list
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const pName = (item?.patientName || item?.patient?.name || item?.patient || '').toLowerCase()
      const rxId = (item?.prescriptionId || item?.rxNo || item?._id || '').toLowerCase()
      const dName = (item?.doctorName || item?.doctor?.name || item?.doctor || '').toLowerCase()
      const query = search.toLowerCase()
      
      return pName.includes(query) || rxId.includes(query) || dName.includes(query)
    })
  }, [items, search])

  // Create Submit Action
  async function handleCreateSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        patientName: createForm.patientName,
        doctorName: createForm.doctorName,
        medicines: [{
          medicineName: createForm.medicineName,
          dosage: createForm.dosage,
          frequency: createForm.frequency,
          duration: createForm.duration,
          quantity: Number(createForm.quantity || 1),
          instructions: createForm.instructions
        }]
      }
      await createManualPharmacyPrescription(body)
      showToast('Prescription created successfully!')
      setCreateOpen(false)
      setCreateForm({
        patientName: '',
        doctorName: '',
        medicineName: '',
        dosage: '1 tablet',
        frequency: 'Once Daily',
        duration: '5 days',
        quantity: '5',
        instructions: 'Take after meals'
      })
      await refresh()
      loadSummaryMetrics()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Update Submit Action
  async function handleUpdateSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        patientName: editForm.patientName,
        doctorName: editForm.doctorName,
        medicines: [{
          medicineName: editForm.medicineName,
          dosage: editForm.dosage,
          frequency: editForm.frequency,
          duration: editForm.duration,
          quantity: Number(editForm.quantity || 1),
          instructions: editForm.instructions
        }],
        status: editForm.status
      }
      await updateDoctorPrescription(editForm.id, body)
      showToast('Prescription updated successfully!')
      setEditItem(null)
      await refresh()
      loadSummaryMetrics()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Action Helpers: Complete & Cancel
  async function handleComplete(id) {
    setLoading(true)
    try {
      await completeDoctorPrescription(id, {})
      showToast('Prescription completed successfully!')
      await refresh()
      loadSummaryMetrics()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id) {
    setLoading(true)
    try {
      await cancelDoctorPrescription(id, {})
      showToast('Prescription cancelled successfully.')
      await refresh()
      loadSummaryMetrics()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function openEdit(item) {
    const med = Array.isArray(item?.medicines) ? item.medicines[0] : {}
    setEditForm({
      id: item?._id || item?.id,
      patientName: item?.patientName || item?.patient?.name || '',
      doctorName: item?.doctorName || item?.doctor?.name || '',
      medicineName: med?.medicineName || med?.name || item?.medicineName || '',
      dosage: med?.dosage || '',
      frequency: med?.frequency || '',
      duration: med?.duration || '',
      quantity: String(med?.quantity || item?.quantity || ''),
      instructions: med?.instructions || '',
      status: item?.status || 'Pending'
    })
    setEditItem(item)
  }

  // Dynamic getters for columns
  const getPatientName = (item) => item?.patientName || item?.patient?.name || item?.patient || '-'
  const getDoctorName = (item) => item?.doctorName || item?.doctor?.name || item?.doctor || '-'
  const getRxId = (item) => item?.prescriptionId || item?.rxNo || item?._id || '-'
  const getMedicinesText = (item) => {
    if (Array.isArray(item?.medicines)) {
      return item.medicines.map(m => m.medicineName || m.name || m).join(', ')
    }
    return item?.medicineName || item?.medicine || '-'
  }
  const getItemsCount = (item) => {
    if (Array.isArray(item?.medicines)) return item.medicines.length
    return 1
  }
  const getDate = (item) => {
    const d = item?.createdAt || item?.date || '-'
    return d.includes('T') ? d.split('T')[0] : d
  }

  // Badge Status Class
  const getStatusBadge = (item) => {
    const status = String(item?.status || 'Pending').toLowerCase()
    if (status.includes('completed')) return <span className="branch-status active">Completed</span>
    if (status.includes('cancelled')) return <span className="branch-status expired">Cancelled</span>
    if (status.includes('progress') || status.includes('dispensed')) return <span className="branch-status view">In Progress</span>
    return <span className="branch-status near-expiry">Pending</span>
  }

  return (
    <AdminLayout activeLabel="Prescriptions" title="Doctor Prescriptions" subtitle="View and manage prescriptions received from doctors.">
      <div className="stock-scroll-area">
        <div className="presc-layout-container">

          {/* Workflow Buttons Toolbar */}
          <div className="presc-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '8px' }}>
            <div className="presc-action-btns">
              <button 
                type="button" 
                className="presc-btn presc-btn-primary"
                onClick={() => setCreateOpen(true)}
              >
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Prescription
              </button>
            </div>
            <button 
              type="button" 
              className="presc-btn presc-btn-secondary"
              onClick={refresh}
            >
              <svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Refresh
            </button>
          </div>

          {/* Summary Cards (5 Equal Sized Cards) */}
          <div className="presc-summary-grid">
            <div className="presc-summary-card" style={{ '--card-accent': '#2563eb', '--card-bg': '#eff6ff', '--card-border': 'rgba(37, 99, 235, 0.2)' }}>
              <div className="presc-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="presc-summary-info">
                <label>Total Prescriptions</label>
                <span>{summary.total}</span>
              </div>
            </div>

            <div className="presc-summary-card" style={{ '--card-accent': '#f59e0b', '--card-bg': '#fef3c7', '--card-border': 'rgba(245, 158, 11, 0.2)' }}>
              <div className="presc-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="presc-summary-info">
                <label>Pending</label>
                <span>{summary.pending}</span>
              </div>
            </div>

            <div className="presc-summary-card" style={{ '--card-accent': '#0ea5e9', '--card-bg': '#e0f2fe', '--card-border': 'rgba(14, 165, 233, 0.2)' }}>
              <div className="presc-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m14.5 4.5 5 5a4.24 4.24 0 0 1-6 6l-5-5a4.24 4.24 0 0 1 6-6Z"/>
                </svg>
              </div>
              <div className="presc-summary-info">
                <label>In Progress</label>
                <span>{summary.inProgress}</span>
              </div>
            </div>

            <div className="presc-summary-card" style={{ '--card-accent': '#10b981', '--card-bg': '#ecfdf5', '--card-border': 'rgba(16, 185, 129, 0.2)' }}>
              <div className="presc-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="presc-summary-info">
                <label>Completed</label>
                <span>{summary.completed}</span>
              </div>
            </div>

            <div className="presc-summary-card" style={{ '--card-accent': '#ef4444', '--card-bg': '#fee2e2', '--card-border': 'rgba(239, 68, 68, 0.2)' }}>
              <div className="presc-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div className="presc-summary-info">
                <label>Cancelled</label>
                <span>{summary.cancelled}</span>
              </div>
            </div>
          </div>

          {/* Search Inputs */}
          <div className="presc-toolbar">
            <div className="presc-search-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search patient, prescription ID, doctor..." 
              />
            </div>
          </div>

          {/* Prescriptions Table */}
          <section className="dispense-table-panel">
            <h2>Prescription Records</h2>
            
            {loading ? (
              <div className="dispense-skeleton-row">
                <div className="dispense-skeleton-line" style={{ width: '80%' }}></div>
                <div className="dispense-skeleton-line" style={{ width: '90%' }}></div>
                <div className="dispense-skeleton-line" style={{ width: '70%' }}></div>
              </div>
            ) : (
              <div className="branch-table-wrap">
                <table className="branch-table">
                  <thead>
                    <tr>
                      <th>Prescription ID</th>
                      <th>Patient Name</th>
                      <th>Doctor</th>
                      <th>Prescription Date</th>
                      <th>Medicines</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th style={{ width: '180px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length ? filteredItems.map((item, index) => (
                      <tr key={getId(item, index)}>
                        <td><code>{getRxId(item)}</code></td>
                        <td><div style={{ fontWeight: 600, color: '#1e293b' }}>{getPatientName(item)}</div></td>
                        <td>{getDoctorName(item)}</td>
                        <td>{getDate(item)}</td>
                        <td>{getMedicinesText(item)}</td>
                        <td>{getItemsCount(item)}</td>
                        <td>{getStatusBadge(item)}</td>
                        <td>
                          <div className="admin-action-group">
                            <button 
                              type="button" 
                              className="admin-action-button view" 
                              aria-label="View Details" 
                              title="View Details"
                              onClick={() => setViewingItem(item)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button edit" 
                              aria-label="Update Details" 
                              title="Update Details"
                              onClick={() => openEdit(item)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button assign" 
                              aria-label="Complete Prescription" 
                              title="Complete Prescription"
                              onClick={() => handleComplete(item?._id || item?.id)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button danger" 
                              aria-label="Cancel Prescription" 
                              title="Cancel Prescription"
                              onClick={() => handleCancel(item?._id || item?.id)}
                            >
                              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8">
                          <div className="dispense-empty-state">
                            <h3>No prescriptions found.</h3>
                            <p>Doctor prescriptions will appear here when they are received.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Modal 1: Create Prescription */}
          {createOpen && (
            <div className="presc-modal-overlay">
              <form onSubmit={handleCreateSubmit} className="presc-modal-container">
                <div className="presc-modal-header">
                  <h2>Create New Prescription</h2>
                  <button type="button" className="presc-modal-close" onClick={() => setCreateOpen(false)}>&times;</button>
                </div>
                <div className="presc-modal-body">
                  <div className="presc-detail-row">
                    <div className="presc-form-group">
                      <label>Patient Name</label>
                      <input 
                        type="text" 
                        value={createForm.patientName} 
                        onChange={(e) => setCreateForm({...createForm, patientName: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="presc-form-group">
                      <label>Doctor Name</label>
                      <input 
                        type="text" 
                        value={createForm.doctorName} 
                        onChange={(e) => setCreateForm({...createForm, doctorName: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="presc-detail-row">
                    <div className="presc-form-group">
                      <label>Medicine Name</label>
                      <input 
                        type="text" 
                        value={createForm.medicineName} 
                        onChange={(e) => setCreateForm({...createForm, medicineName: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="presc-form-group">
                      <label>Dosage</label>
                      <input 
                        type="text" 
                        value={createForm.dosage} 
                        onChange={(e) => setCreateForm({...createForm, dosage: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="presc-detail-row">
                    <div className="presc-form-group">
                      <label>Frequency</label>
                      <input 
                        type="text" 
                        value={createForm.frequency} 
                        onChange={(e) => setCreateForm({...createForm, frequency: e.target.value})} 
                      />
                    </div>
                    <div className="presc-form-group">
                      <label>Duration</label>
                      <input 
                        type="text" 
                        value={createForm.duration} 
                        onChange={(e) => setCreateForm({...createForm, duration: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="presc-form-group">
                    <label>Quantity</label>
                    <input 
                      type="number" 
                      value={createForm.quantity} 
                      onChange={(e) => setCreateForm({...createForm, quantity: e.target.value})} 
                    />
                  </div>
                  <div className="presc-form-group">
                    <label>Instructions</label>
                    <textarea 
                      value={createForm.instructions} 
                      onChange={(e) => setCreateForm({...createForm, instructions: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="presc-modal-footer">
                  <button type="button" className="presc-btn presc-btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
                  <button type="submit" className="presc-btn presc-btn-primary">Save Prescription</button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 2: Edit Prescription */}
          {editItem && (
            <div className="presc-modal-overlay">
              <form onSubmit={handleUpdateSubmit} className="presc-modal-container">
                <div className="presc-modal-header">
                  <h2>Update Prescription: {getRxId(editItem)}</h2>
                  <button type="button" className="presc-modal-close" onClick={() => setEditItem(null)}>&times;</button>
                </div>
                <div className="presc-modal-body">
                  <div className="presc-detail-row">
                    <div className="presc-form-group">
                      <label>Patient Name</label>
                      <input 
                        type="text" 
                        value={editForm.patientName} 
                        onChange={(e) => setEditForm({...editForm, patientName: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="presc-form-group">
                      <label>Doctor Name</label>
                      <input 
                        type="text" 
                        value={editForm.doctorName} 
                        onChange={(e) => setEditForm({...editForm, doctorName: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="presc-detail-row">
                    <div className="presc-form-group">
                      <label>Medicine Name</label>
                      <input 
                        type="text" 
                        value={editForm.medicineName} 
                        onChange={(e) => setEditForm({...editForm, medicineName: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="presc-form-group">
                      <label>Dosage</label>
                      <input 
                        type="text" 
                        value={editForm.dosage} 
                        onChange={(e) => setEditForm({...editForm, dosage: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="presc-detail-row">
                    <div className="presc-form-group">
                      <label>Frequency</label>
                      <input 
                        type="text" 
                        value={editForm.frequency} 
                        onChange={(e) => setEditForm({...editForm, frequency: e.target.value})} 
                      />
                    </div>
                    <div className="presc-form-group">
                      <label>Duration</label>
                      <input 
                        type="text" 
                        value={editForm.duration} 
                        onChange={(e) => setEditForm({...editForm, duration: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="presc-detail-row">
                    <div className="presc-form-group">
                      <label>Quantity</label>
                      <input 
                        type="number" 
                        value={editForm.quantity} 
                        onChange={(e) => setEditForm({...editForm, quantity: e.target.value})} 
                      />
                    </div>
                    <div className="presc-form-group">
                      <label>Status</label>
                      <select 
                        value={editForm.status} 
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div className="presc-form-group">
                    <label>Instructions</label>
                    <textarea 
                      value={editForm.instructions} 
                      onChange={(e) => setEditForm({...editForm, instructions: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="presc-modal-footer">
                  <button type="button" className="presc-btn presc-btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
                  <button type="submit" className="presc-btn presc-btn-primary">Update Prescription</button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 3: View Details (Drawer style popup) */}
          {viewingItem && (
            <div className="presc-modal-overlay">
              <div className="presc-modal-container">
                <div className="presc-modal-header">
                  <h2>Prescription Profile Details: {getRxId(viewingItem)}</h2>
                  <button type="button" className="presc-modal-close" onClick={() => setViewingItem(null)}>&times;</button>
                </div>
                <div className="presc-modal-body">
                  
                  <div className="presc-detail-row">
                    <div className="presc-detail-item">
                      <label>Patient Information</label>
                      <span>{getPatientName(viewingItem)}</span>
                    </div>
                    <div className="presc-detail-item">
                      <label>Doctor Information</label>
                      <span>{getDoctorName(viewingItem)}</span>
                    </div>
                  </div>

                  <div className="presc-detail-row">
                    <div className="presc-detail-item">
                      <label>Prescription Date</label>
                      <span>{getDate(viewingItem)}</span>
                    </div>
                    <div className="presc-detail-item">
                      <label>Status</label>
                      <div>{getStatusBadge(viewingItem)}</div>
                    </div>
                  </div>

                  <div className="presc-detail-item">
                    <label>Medicines Prescribed</label>
                    <div className="presc-detail-list">
                      {Array.isArray(viewingItem?.medicines) ? viewingItem.medicines.map((med, index) => (
                        <div key={index} className="presc-medicine-tag">
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{med.medicineName || med.name}</div>
                          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                            Dosage: {med.dosage || '-'} | Freq: {med.frequency || '-'} | Duration: {med.duration || '-'} | Qty: {med.quantity || 1}
                          </div>
                          {med.instructions && (
                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                              &ldquo;{med.instructions}&rdquo;
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="presc-medicine-tag">
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{viewingItem?.medicineName || viewingItem?.medicine || '-'}</div>
                          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                            Qty: {viewingItem?.quantity || 1}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
                <div className="presc-modal-footer">
                  <button type="button" className="presc-btn presc-btn-primary" onClick={() => setViewingItem(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  )
}
