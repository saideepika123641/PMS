import { useEffect, useState, useMemo } from 'react'
import { useToast } from '../../components/ToastProvider'
import AdminLayout from './AdminLayout'
import { 
  changeSupplierStatus, 
  createSupplier, 
  deleteSupplier, 
  getSupplier, 
  getSupplierPurchaseHistory, 
  listSuppliers, 
  updateSupplier,
  getPharmacyAdminDashboard
} from '../../config/api'
import './Suppliers.css'

const normalizeList = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.suppliers)) return response.suppliers
  return []
}

function getId(item, index) {
  return item?._id || item?.id || `${index}`
}

export default function Suppliers() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [viewingItem, setViewineItem] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [historyItem, setHistoryItem] = useState(null)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  
  // Dashboard summaries
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    pending: 0,
    purchases: '₹0'
  })

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    estNumber: '',
    status: 'Active',
    notes: ''
  })

  // Edit Form State
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    estNumber: '',
    status: 'Active',
    notes: ''
  })

  // Validation Error States
  const [createErrors, setCreateErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})

  function validateCreateForm() {
    const errs = {}
    const nameVal = (createForm.name || '').trim()
    if (!nameVal) {
      errs.name = 'Supplier Name is required.'
    } else if (nameVal.length < 2) {
      errs.name = 'Supplier Name must be at least 2 characters.'
    }

    const contactVal = (createForm.contactPerson || '').trim()
    if (!contactVal) {
      errs.contactPerson = 'Contact Person name is required.'
    } else if (contactVal.length < 2) {
      errs.contactPerson = 'Contact Person name must be at least 2 characters.'
    }

    const phoneVal = (createForm.phone || '').trim()
    if (!phoneVal) {
      errs.phone = 'Phone Number is required.'
    } else {
      const cleanPhone = phoneVal.replace(/[+\-\s()]/g, '')
      if (isNaN(Number(cleanPhone)) || cleanPhone.length < 8) {
        errs.phone = 'Please enter a valid phone number (at least 8 digits).'
      }
    }

    const emailVal = (createForm.email || '').trim()
    if (emailVal) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailVal)) {
        errs.email = 'Please enter a valid email address.'
      }
    }

    const statusVal = (createForm.status || '').trim()
    if (!statusVal) {
      errs.status = 'Please select a status.'
    }

    setCreateErrors(errs)
    const firstKey = Object.keys(errs)[0]
    if (firstKey) {
      const el = document.getElementById(`create-${firstKey}`)
      if (el) el.focus()
    }
    return Object.keys(errs).length === 0
  }

  function validateEditForm() {
    const errs = {}
    const nameVal = (editForm.name || '').trim()
    if (!nameVal) {
      errs.name = 'Supplier Name is required.'
    } else if (nameVal.length < 2) {
      errs.name = 'Supplier Name must be at least 2 characters.'
    }

    const contactVal = (editForm.contactPerson || '').trim()
    if (!contactVal) {
      errs.contactPerson = 'Contact Person name is required.'
    } else if (contactVal.length < 2) {
      errs.contactPerson = 'Contact Person name must be at least 2 characters.'
    }

    const phoneVal = (editForm.phone || '').trim()
    if (!phoneVal) {
      errs.phone = 'Phone Number is required.'
    } else {
      const cleanPhone = phoneVal.replace(/[+\-\s()]/g, '')
      if (isNaN(Number(cleanPhone)) || cleanPhone.length < 8) {
        errs.phone = 'Please enter a valid phone number (at least 8 digits).'
      }
    }

    const emailVal = (editForm.email || '').trim()
    if (emailVal) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailVal)) {
        errs.email = 'Please enter a valid email address.'
      }
    }

    const statusVal = (editForm.status || '').trim()
    if (!statusVal) {
      errs.status = 'Please select a status.'
    }

    setEditErrors(errs)
    const firstKey = Object.keys(errs)[0]
    if (firstKey) {
      const el = document.getElementById(`edit-${firstKey}`)
      if (el) el.focus()
    }
    return Object.keys(errs).length === 0
  }

  async function loadSummaryMetrics() {
    try {
      const response = await getPharmacyAdminDashboard()
      const data = response?.data || response || {}
      setSummary({
        total: Number(data?.totalSuppliers || data?.suppliersCount || 0),
        active: Number(data?.activeSuppliers || data?.activeSuppliersCount || 0),
        pending: Number(data?.pendingSuppliers || data?.pendingSuppliersCount || 0),
        purchases: `₹${data?.totalPurchases || data?.purchasesTotal || 0}`
      })
    } catch (e) {
      console.log('Unable to load Supplier metrics:', e.message)
    }
  }

  async function refresh() {
    setLoading(true)
    try {
      const response = await listSuppliers()
      const list = normalizeList(response)
      setItems(list)
      // Recalculate summary totals locally if dashboard is offline
      if (list.length > 0) {
        setSummary(prev => ({
          ...prev,
          total: list.length,
          active: list.filter(s => String(s.status || 'active').toLowerCase() === 'active').length,
          pending: list.filter(s => String(s.status).toLowerCase() === 'pending').length
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

  // Filtered Suppliers list
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const sName = (item?.name || item?.supplierName || '').toLowerCase()
      const sPhone = (item?.phone || '').toLowerCase()
      const sEmail = (item?.email || '').toLowerCase()
      const query = search.toLowerCase()
      
      const matchesSearch = sName.includes(query) || sPhone.includes(query) || sEmail.includes(query)
      const matchesStatus = statusFilter === 'all' || String(item?.status || 'active').toLowerCase() === statusFilter.toLowerCase()
      
      return matchesSearch && matchesStatus
    })
  }, [items, search, statusFilter])

  // Create Submit Action
  async function handleCreateSubmit(e) {
    e.preventDefault()
    if (!validateCreateForm()) return
    setLoading(true)
    try {
      const body = {
        name: createForm.name,
        contactPerson: createForm.contactPerson,
        phone: createForm.phone,
        email: createForm.email,
        address: createForm.address,
        city: createForm.city,
        state: createForm.state,
        estNumber: createForm.estNumber,
        status: createForm.status,
        notes: createForm.notes
      }
      await createSupplier(body)
      showToast('Supplier created successfully!')
      setCreateOpen(false)
      setCreateForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        estNumber: '',
        status: 'Active',
        notes: ''
      })
      setCreateErrors({})
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
    if (!validateEditForm()) return
    setLoading(true)
    try {
      const body = {
        name: editForm.name,
        contactPerson: editForm.contactPerson,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        estNumber: editForm.estNumber,
        status: editForm.status,
        notes: editForm.notes
      }
      await updateSupplier(editForm.id, body)
      showToast('Supplier updated successfully!')
      setEditItem(null)
      setEditErrors({})
      await refresh()
      loadSummaryMetrics()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Action Helpers: Delete
  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      return
    }
    setLoading(true)
    try {
      await deleteSupplier(id)
      showToast('Supplier deleted successfully.')
      await refresh()
      loadSummaryMetrics()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChanee(item) {
    const id = item?._id || item?.id
    const currentStatus = String(item?.status || 'Active').toLowerCase()
    const status = currentStatus === 'active' ? 'Inactive' : 'Active'

    setLoading(true)
    try {
      await changeSupplierStatus(id, { status })
      showToast(`Supplier marked as ${status}.`)
      await refresh()
      loadSummaryMetrics()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function openEdit(item) {
    setEditForm({
      id: item?._id || item?.id,
      name: item?.name || item?.supplierName || '',
      contactPerson: item?.contactPerson || '',
      phone: item?.phone || '',
      email: item?.email || '',
      address: item?.address || '',
      city: item?.city || '',
      state: item?.state || '',
      estNumber: item?.estNumber || '',
      status: item?.status || 'Active',
      notes: item?.notes || ''
    })
    setEditItem(item)
  }

  async function openView(item) {
    const id = item?._id || item?.id
    try {
      const response = await getSupplier(id)
      setViewineItem(response?.data || response || item)
    } catch (e) {
      setViewineItem(item)
    }
  }

  async function openHistory(item) {
    setHistoryItem(item)
    setHistoryLoading(true)
    try {
      const id = item?._id || item?.id
      const response = await getSupplierPurchaseHistory(id)
      setHistoryList(normalizeList(response))
    } catch (e) {
      showToast('Unable to load purchase logs locally.', 'info')
      setHistoryList([])
    } finally {
      setHistoryLoading(false)
    }
  }

  // Dynamic getters for columns
  const getSupplierName = (item) => item?.name || item?.supplierName || '-'
  const getContactPerson = (item) => item?.contactPerson || '-'
  const getPhone = (item) => item?.phone || '-'
  const getEmail = (item) => item?.email || '-'
  const getMedicines = (item) => item?.medicinesText || item?.products || item?.notes || '-'
  const getLastPurchase = (item) => {
    const d = item?.lastPurchaseDate || item?.lastPurchase || '-'
    return d.includes('T') ? d.split('T')[0] : d
  }

  // Badge Status Class
  const getStatusBadge = (item) => {
    const status = String(item?.status || 'Active').toLowerCase()
    if (status.includes('active')) return <span className="branch-status active">Active</span>
    if (status.includes('pending')) return <span className="branch-status near-expiry">Pending</span>
    return <span className="branch-status expired">Inactive</span>
  }

  return (
    <AdminLayout activeLabel="Suppliers" title="Suppliers" subtitle="Manaee medicine suppliers, contacts, purchases, and supplier status.">
      <div className="stock-scroll-area">
        <div className="sup-layout-container">

          {/* Workflow Buttons Toolbar */}
          <div className="sup-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '8px' }}>
            <div className="sup-action-btns">
              <button 
                type="button" 
                className="sup-btn sup-btn-primary"
                onClick={() => setCreateOpen(true)}
              >
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Supplier
              </button>
            </div>
            <button 
              type="button" 
              className="sup-btn sup-btn-secondary"
              onClick={refresh}
            >
              <svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Refresh
            </button>
          </div>

          {/* Summary Cards (4 Equal Sized Cards) */}
          <div className="sup-summary-grid">
            <div className="sup-summary-card" style={{ '--card-accent': '#2563eb', '--card-bg': '#eff6ff', '--card-border': 'rgba(37, 99, 235, 0.2)' }}>
              <div className="sup-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="sup-summary-info">
                <label>Total Suppliers</label>
                <span>{summary.total}</span>
              </div>
            </div>

            <div className="sup-summary-card" style={{ '--card-accent': '#10b981', '--card-bg': '#ecfdf5', '--card-border': 'rgba(16, 185, 129, 0.2)' }}>
              <div className="sup-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="sup-summary-info">
                <label style={{ color: '#10b981' }}>Active Suppliers</label>
                <span style={{ color: '#10b981' }}>{summary.active}</span>
              </div>
            </div>

            <div className="sup-summary-card" style={{ '--card-accent': '#f59e0b', '--card-bg': '#fef3c7', '--card-border': 'rgba(245, 158, 11, 0.2)' }}>
              <div className="sup-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="sup-summary-info">
                <label style={{ color: '#f59e0b' }}>Pending Suppliers</label>
                <span style={{ color: '#f59e0b' }}>{summary.pending}</span>
              </div>
            </div>

            <div className="sup-summary-card" style={{ '--card-accent': '#0ea5e9', '--card-bg': '#e0f2fe', '--card-border': 'rgba(14, 165, 233, 0.2)' }}>
              <div className="sup-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="sup-summary-info">
                <label style={{ color: '#0ea5e9' }}>Total Purchases</label>
                <span style={{ color: '#0ea5e9' }}>{summary.purchases}</span>
              </div>
            </div>
          </div>

          {/* Search Inputs */}
          <div className="sup-toolbar">
            <div className="sup-search-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search suppliers by name, phone, email..." 
              />
            </div>
            <div className="sup-filters">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              <button 
                type="button" 
                className="sup-btn sup-btn-secondary"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Table Results */}
          <section className="dispense-table-panel">
            <h2>Supplier Records</h2>
            
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
                      <th style={{ width: '60px' }}>S.No.</th>
                      <th>Supplier Name</th>
                      <th>Contact Person</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Medicines / Products</th>
                      <th>Last Purchase</th>
                      <th>Status</th>
                      <th style={{ width: '180px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length ? filteredItems.map((item, index) => (
                      <tr key={getId(item, index)}>
                        <td>{index + 1}</td>
                        <td><div style={{ fontWeight: 600, color: '#1e293b' }}>{getSupplierName(item)}</div></td>
                        <td>{getContactPerson(item)}</td>
                        <td>{getPhone(item)}</td>
                        <td>{getEmail(item)}</td>
                        <td>{getMedicines(item)}</td>
                        <td>{getLastPurchase(item)}</td>
                        <td>{getStatusBadge(item)}</td>
                        <td>
                          <div className="admin-action-group">
                            <button 
                              type="button" 
                              className="admin-action-button view" 
                              aria-label="View Details" 
                              title="View Details"
                              onClick={() => openView(item)}
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
                              className="admin-action-button assien" 
                              style={{ color: '#7c3aed', borderColor: '#ddd6fe', background: '#f5f3ff' }}
                              aria-label="Purchase History" 
                              title="Purchase History"
                              onClick={() => openHistory(item)}
                            >
                              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button assien" 
                              style={{ color: '#0f766e', borderColor: '#99f6e4', background: '#f0fdfa' }}
                              aria-label="Chanee Status" 
                              title="Chanee Status"
                              onClick={() => handleStatusChanee(item)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M8 12l3 3 5-6"/><path d="M21 12a9 9 0 1 1-9-9"/></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button daneer" 
                              aria-label="Delete Supplier" 
                              title="Delete Supplier"
                              onClick={() => handleDelete(item?._id || item?.id)}
                            >
                              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="9">
                          <div className="dispense-empty-state">
                            <h3>No suppliers found.</h3>
                            <p>Add your first supplier to start managing pharmacy purchases.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Modal 1: Create Supplier */}
          {createOpen && (
            <div className="sup-modal-overlay">
              <form onSubmit={handleCreateSubmit} className="sup-modal-container" noValidate>
                <div className="sup-modal-header">
                  <h2>Create New Supplier</h2>
                  <button type="button" className="sup-modal-close" onClick={() => setCreateOpen(false)}>&times;</button>
                </div>
                <div className="sup-modal-body">
                  <div className="sup-form-grid">
                    <div className="sup-form-group">
                      <label>Supplier Name *</label>
                      <input 
                        type="text" 
                        id="create-name"
                        value={createForm.name} 
                        onChange={(e) => {
                          setCreateForm({...createForm, name: e.target.value})
                          if (createErrors.name) setCreateErrors({...createErrors, name: ''})
                        }} 
                        style={createErrors.name ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {createErrors.name && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.name}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>Contact Person *</label>
                      <input 
                        type="text" 
                        id="create-contactPerson"
                        value={createForm.contactPerson} 
                        onChange={(e) => {
                          setCreateForm({...createForm, contactPerson: e.target.value})
                          if (createErrors.contactPerson) setCreateErrors({...createErrors, contactPerson: ''})
                        }} 
                        style={createErrors.contactPerson ? { borderColor: '#ef4444' } : {}}
                        required
                      />
                      {createErrors.contactPerson && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.contactPerson}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>Phone Number *</label>
                      <input 
                        type="text" 
                        id="create-phone"
                        value={createForm.phone} 
                        onChange={(e) => {
                          setCreateForm({...createForm, phone: e.target.value})
                          if (createErrors.phone) setCreateErrors({...createErrors, phone: ''})
                        }} 
                        style={createErrors.phone ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {createErrors.phone && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.phone}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        id="create-email"
                        value={createForm.email} 
                        onChange={(e) => {
                          setCreateForm({...createForm, email: e.target.value})
                          if (createErrors.email) setCreateErrors({...createErrors, email: ''})
                        }} 
                        style={createErrors.email ? { borderColor: '#ef4444' } : {}}
                      />
                      {createErrors.email && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.email}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>GST / Tax ID</label>
                      <input 
                        type="text" 
                        id="create-estNumber"
                        value={createForm.estNumber} 
                        onChange={(e) => setCreateForm({...createForm, estNumber: e.target.value})} 
                      />
                    </div>
                    <div className="sup-form-group">
                      <label>Status *</label>
                      <select 
                        id="create-status"
                        value={createForm.status} 
                        onChange={(e) => {
                          setCreateForm({...createForm, status: e.target.value})
                          if (createErrors.status) setCreateErrors({...createErrors, status: ''})
                        }}
                        style={createErrors.status ? { borderColor: '#ef4444' } : {}}
                      >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      {createErrors.status && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.status}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>City</label>
                      <input 
                        type="text" 
                        id="create-city"
                        value={createForm.city} 
                        onChange={(e) => setCreateForm({...createForm, city: e.target.value})} 
                      />
                    </div>
                    <div className="sup-form-group">
                      <label>State</label>
                      <input 
                        type="text" 
                        id="create-state"
                        value={createForm.state} 
                        onChange={(e) => setCreateForm({...createForm, state: e.target.value})} 
                      />
                    </div>
                    <div className="sup-form-group full-width">
                      <label>Address</label>
                      <textarea 
                        id="create-address"
                        value={createForm.address} 
                        onChange={(e) => setCreateForm({...createForm, address: e.target.value})} 
                      />
                    </div>
                    <div className="sup-form-group full-width">
                      <label>Notes</label>
                      <textarea 
                        id="create-notes"
                        value={createForm.notes} 
                        onChange={(e) => setCreateForm({...createForm, notes: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
                <div className="sup-modal-footer">
                  <button type="button" className="sup-btn sup-btn-secondary" onClick={() => setCreateOpen(false)} disabled={loading}>Cancel</button>
                  <button type="submit" className="sup-btn sup-btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Supplier'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 2: Edit Supplier */}
          {editItem && (
            <div className="sup-modal-overlay">
              <form onSubmit={handleUpdateSubmit} className="sup-modal-container" noValidate>
                <div className="sup-modal-header">
                  <h2>Update Supplier: {getSupplierName(editItem)}</h2>
                  <button type="button" className="sup-modal-close" onClick={() => setEditItem(null)}>&times;</button>
                </div>
                <div className="sup-modal-body">
                  <div className="sup-form-grid">
                    <div className="sup-form-group">
                      <label>Supplier Name *</label>
                      <input 
                        type="text" 
                        id="edit-name"
                        value={editForm.name} 
                        onChange={(e) => {
                          setEditForm({...editForm, name: e.target.value})
                          if (editErrors.name) setEditErrors({...editErrors, name: ''})
                        }} 
                        style={editErrors.name ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {editErrors.name && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.name}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>Contact Person *</label>
                      <input 
                        type="text" 
                        id="edit-contactPerson"
                        value={editForm.contactPerson} 
                        onChange={(e) => {
                          setEditForm({...editForm, contactPerson: e.target.value})
                          if (editErrors.contactPerson) setEditErrors({...editErrors, contactPerson: ''})
                        }} 
                        style={editErrors.contactPerson ? { borderColor: '#ef4444' } : {}}
                        required
                      />
                      {editErrors.contactPerson && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.contactPerson}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>Phone Number *</label>
                      <input 
                        type="text" 
                        id="edit-phone"
                        value={editForm.phone} 
                        onChange={(e) => {
                          setEditForm({...editForm, phone: e.target.value})
                          if (editErrors.phone) setEditErrors({...editErrors, phone: ''})
                        }} 
                        style={editErrors.phone ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {editErrors.phone && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.phone}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        id="edit-email"
                        value={editForm.email} 
                        onChange={(e) => {
                          setEditForm({...editForm, email: e.target.value})
                          if (editErrors.email) setEditErrors({...editErrors, email: ''})
                        }} 
                        style={editErrors.email ? { borderColor: '#ef4444' } : {}}
                      />
                      {editErrors.email && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.email}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>GST / Tax ID</label>
                      <input 
                        type="text" 
                        id="edit-estNumber"
                        value={editForm.estNumber} 
                        onChange={(e) => setEditForm({...editForm, estNumber: e.target.value})} 
                      />
                    </div>
                    <div className="sup-form-group">
                      <label>Status *</label>
                      <select 
                        id="edit-status"
                        value={editForm.status} 
                        onChange={(e) => {
                          setEditForm({...editForm, status: e.target.value})
                          if (editErrors.status) setEditErrors({...editErrors, status: ''})
                        }}
                        style={editErrors.status ? { borderColor: '#ef4444' } : {}}
                      >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      {editErrors.status && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.status}</span>
                      )}
                    </div>
                    <div className="sup-form-group">
                      <label>City</label>
                      <input 
                        type="text" 
                        id="edit-city"
                        value={editForm.city} 
                        onChange={(e) => setEditForm({...editForm, city: e.target.value})} 
                      />
                    </div>
                    <div className="sup-form-group">
                      <label>State</label>
                      <input 
                        type="text" 
                        id="edit-state"
                        value={editForm.state} 
                        onChange={(e) => setEditForm({...editForm, state: e.target.value})} 
                      />
                    </div>
                    <div className="sup-form-group full-width">
                      <label>Address</label>
                      <textarea 
                        id="edit-address"
                        value={editForm.address} 
                        onChange={(e) => setEditForm({...editForm, address: e.target.value})} 
                      />
                    </div>
                    <div className="sup-form-group full-width">
                      <label>Notes</label>
                      <textarea 
                        id="edit-notes"
                        value={editForm.notes} 
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
                <div className="sup-modal-footer">
                  <button type="button" className="sup-btn sup-btn-secondary" onClick={() => setEditItem(null)} disabled={loading}>Cancel</button>
                  <button type="submit" className="sup-btn sup-btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Supplier'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 3: View Details */}
          {viewingItem && (
            <div className="sup-modal-overlay">
              <div className="sup-modal-container">
                <div className="sup-modal-header">
                  <h2>Supplier Details Profile: {getSupplierName(viewingItem)}</h2>
                  <button type="button" className="sup-modal-close" onClick={() => setViewineItem(null)}>&times;</button>
                </div>
                <div className="sup-modal-body">
                  <div className="sup-detail-row">
                    <div className="sup-detail-item">
                      <label>Supplier Name</label>
                      <span>{getSupplierName(viewingItem)}</span>
                    </div>
                    <div className="sup-detail-item">
                      <label>Contact Person</label>
                      <span>{getContactPerson(viewingItem)}</span>
                    </div>
                  </div>
                  <div className="sup-detail-row">
                    <div className="sup-detail-item">
                      <label>Phone Number</label>
                      <span>{getPhone(viewingItem)}</span>
                    </div>
                    <div className="sup-detail-item">
                      <label>Email Address</label>
                      <span>{getEmail(viewingItem)}</span>
                    </div>
                  </div>
                  <div className="sup-detail-row">
                    <div className="sup-detail-item">
                      <label>Tax / GST Number</label>
                      <span>{viewingItem?.estNumber || '-'}</span>
                    </div>
                    <div className="sup-detail-item">
                      <label>Status</label>
                      <div style={{ marginTop: '4px' }}>{getStatusBadge(viewingItem)}</div>
                    </div>
                  </div>
                  <div className="sup-detail-row">
                    <div className="sup-detail-item">
                      <label>City / State</label>
                      <span>{(viewingItem?.city || viewingItem?.state) ? `${viewingItem?.city || ''}, ${viewingItem?.state || ''}` : '-'}</span>
                    </div>
                    <div className="sup-detail-item">
                      <label>Last Purchase Date</label>
                      <span>{getLastPurchase(viewingItem)}</span>
                    </div>
                  </div>
                  <div className="sup-form-group">
                    <label>Full Address</label>
                    <span style={{ fontSize: '13px', color: '#475569' }}>{viewingItem?.address || '-'}</span>
                  </div>
                  {viewingItem?.notes && (
                    <div className="sup-form-group">
                      <label>Notes</label>
                      <span style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>&ldquo;{viewingItem.notes}&rdquo;</span>
                    </div>
                  )}
                </div>
                <div className="sup-modal-footer">
                  <button type="button" className="sup-btn sup-btn-primary" onClick={() => setViewineItem(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal 4: Purchase History */}
          {historyItem && (
            <div className="sup-modal-overlay">
              <div className="sup-modal-container" style={{ maxWidth: '750px' }}>
                <div className="sup-modal-header">
                  <h2>Purchase History: {getSupplierName(historyItem)}</h2>
                  <button type="button" className="sup-modal-close" onClick={() => setHistoryItem(null)}>&times;</button>
                </div>
                <div className="sup-modal-body">
                  {historyLoading ? (
                    <p style={{ color: '#64748b', fontSize: '14px' }}>Loading transaction records...</p>
                  ) : (
                    <div className="branch-table-wrap">
                      <table className="branch-table">
                        <thead>
                          <tr>
                            <th>Purchase Order ID</th>
                            <th>Purchase Date</th>
                            <th>Invoice Number</th>
                            <th>Items Count</th>
                            <th>Total Amount</th>
                            <th>Payment Status</th>
                            <th>Purchase Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyList.length ? historyList.map((item, idx) => (
                            <tr key={item?._id || idx}>
                              <td><code>{item?.poNumber || item?.poNo || item?._id || '-'}</code></td>
                              <td>{item?.date || item?.createdAt?.split('T')[0] || '-'}</td>
                              <td><code>{item?.invoiceNumber || item?.invoiceNo || '-'}</code></td>
                              <td>{item?.itemsCount || item?.quantity || 1}</td>
                              <td>₹{item?.amount || item?.totalAmount || 0}</td>
                              <td>
                                <span className={`branch-status ${String(item?.paymentStatus || 'unpaid').toLowerCase().includes('paid') && !String(item?.paymentStatus).toLowerCase().includes('un') ? 'active' : 'expired'}`}>
                                  {item?.paymentStatus || 'Unpaid'}
                                </span>
                              </td>
                              <td>
                                <span className={`branch-status ${String(item?.status || 'received').toLowerCase().includes('received') ? 'active' : 'view'}`}>
                                  {item?.status || 'Completed'}
                                </span>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                                No purchase logs found for this supplier.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="sup-modal-footer">
                  <button type="button" className="sup-btn sup-btn-primary" onClick={() => setHistoryItem(null)}>Close Logs</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  )
}
