import { useEffect, useState, useMemo } from 'react'
import { useToast } from '../../components/ToastProvider'
import AdminLayout from './AdminLayout'
import { 
  changePurchaseOrderStatus, 
  createPurchaseOrder, 
  getPurchaseOrder, 
  listPendingPurchaseOrders, 
  listPurchaseOrders, 
  receivePurchaseOrder,
  getPharmacyAdminDashboard,
  updatePurchaseOrder
} from '../../config/api'
import './PurchaseOrders.css'

const normalizeList = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.orders)) return response.orders
  return []
}

function getId(item, index) {
  return item?._id || item?.id || item?.poNumber || item?.poNo || `${index}`
}

export default function PurchaseOrders() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  
  // Modal states
  const [viewingItem, setViewineItem] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  
  // Dashboard summaries
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    ordered: 0,
    partial: 0,
    received: 0,
    totalAmount: '₹0'
  })

  // Create Form State
  const [createForm, setCreateForm] = useState({
    supplierName: '',
    supplierContact: '',
    medicineName: '',
    batchNo: '',
    quantity: '',
    unitPrice: '',
    paymentStatus: 'Unpaid',
    status: 'Pending'
  })

  // Edit Form State
  const [editForm, setEditForm] = useState({
    id: '',
    supplierName: '',
    supplierContact: '',
    medicineName: '',
    batchNo: '',
    quantity: '',
    unitPrice: '',
    paymentStatus: 'Unpaid',
    status: 'Pending'
  })

  // Validation Error States
  const [createErrors, setCreateErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})

  function validateCreateForm() {
    const errs = {}
    const sName = (createForm.supplierName || '').trim()
    if (!sName) {
      errs.supplierName = 'Supplier Name is required.'
    } else if (sName.length < 2) {
      errs.supplierName = 'Supplier Name must be at least 2 characters.'
    }

    const sContact = (createForm.supplierContact || '').trim()
    if (!sContact) {
      errs.supplierContact = 'Supplier Contact phone number is required.'
    } else {
      const cleanPhone = sContact.replace(/[+\-\s()]/g, '')
      if (isNaN(Number(cleanPhone)) || cleanPhone.length < 8) {
        errs.supplierContact = 'Please enter a valid contact phone number (at least 8 digits).'
      }
    }

    const mName = (createForm.medicineName || '').trim()
    if (!mName) {
      errs.medicineName = 'Medicine Name is required.'
    } else if (mName.length < 2) {
      errs.medicineName = 'Medicine Name must be at least 2 characters.'
    }

    const batch = (createForm.batchNo || '').trim()
    if (!batch) {
      errs.batchNo = 'Batch Number is required.'
    }

    const qtyStr = String(createForm.quantity || '').trim()
    if (!qtyStr) {
      errs.quantity = 'Purchase Quantity is required.'
    } else {
      const qtyNum = Number(qtyStr)
      if (isNaN(qtyNum) || qtyNum <= 0) {
        errs.quantity = 'Purchase quantity must be greater than 0.'
      } else if (!Number.isInteger(qtyNum)) {
        errs.quantity = 'Purchase quantity must be a whole number.'
      }
    }

    const priceStr = String(createForm.unitPrice || '').trim()
    if (!priceStr) {
      errs.unitPrice = 'Unit Price is required.'
    } else {
      const priceNum = Number(priceStr)
      if (isNaN(priceNum) || priceNum <= 0) {
        errs.unitPrice = 'Unit price must be greater than 0.'
      }
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
    const sName = (editForm.supplierName || '').trim()
    if (!sName) {
      errs.supplierName = 'Supplier Name is required.'
    } else if (sName.length < 2) {
      errs.supplierName = 'Supplier Name must be at least 2 characters.'
    }

    const sContact = (editForm.supplierContact || '').trim()
    if (!sContact) {
      errs.supplierContact = 'Supplier Contact phone number is required.'
    } else {
      const cleanPhone = sContact.replace(/[+\-\s()]/g, '')
      if (isNaN(Number(cleanPhone)) || cleanPhone.length < 8) {
        errs.supplierContact = 'Please enter a valid contact phone number (at least 8 digits).'
      }
    }

    const mName = (editForm.medicineName || '').trim()
    if (!mName) {
      errs.medicineName = 'Medicine Name is required.'
    } else if (mName.length < 2) {
      errs.medicineName = 'Medicine Name must be at least 2 characters.'
    }

    const batch = (editForm.batchNo || '').trim()
    if (!batch) {
      errs.batchNo = 'Batch Number is required.'
    }

    const qtyStr = String(editForm.quantity || '').trim()
    if (!qtyStr) {
      errs.quantity = 'Purchase Quantity is required.'
    } else {
      const qtyNum = Number(qtyStr)
      if (isNaN(qtyNum) || qtyNum <= 0) {
        errs.quantity = 'Purchase quantity must be greater than 0.'
      } else if (!Number.isInteger(qtyNum)) {
        errs.quantity = 'Purchase quantity must be a whole number.'
      }
    }

    const priceStr = String(editForm.unitPrice || '').trim()
    if (!priceStr) {
      errs.unitPrice = 'Unit Price is required.'
    } else {
      const priceNum = Number(priceStr)
      if (isNaN(priceNum) || priceNum <= 0) {
        errs.unitPrice = 'Unit price must be greater than 0.'
      }
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
        total: Number(data?.totalPurchaseOrders || data?.ordersCount || 0),
        pending: Number(data?.pendingOrders || data?.pendingOrdersCount || 0),
        ordered: Number(data?.orderedCount || 0),
        partial: Number(data?.partialReceivedCount || 0),
        received: Number(data?.receivedOrders || data?.receivedOrdersCount || 0),
        totalAmount: `₹${data?.totalPurchaseAmount || data?.purchaseTotal || 0}`
      })
    } catch (e) {
      console.log('Unable to load PO metrics:', e.message)
    }
  }

  async function refresh() {
    setLoading(true)
    try {
      const response = await listPurchaseOrders()
      const list = normalizeList(response)
      setItems(list)
      // Recalculate summary totals locally if dashboard is offline
      if (list.length > 0) {
        const sumVal = list.map(o => Number(o.amount || o.totalAmount || o.total || 0)).reduce((a, b) => a + b, 0)
        setSummary(prev => ({
          ...prev,
          total: list.length,
          pending: list.filter(o => String(o.status || 'pending').toLowerCase() === 'pending').length,
          ordered: list.filter(o => String(o.status).toLowerCase() === 'ordered').length,
          partial: list.filter(o => String(o.status).toLowerCase() === 'partially received').length,
          received: list.filter(o => String(o.status).toLowerCase() === 'received' || String(o.status).toLowerCase() === 'completed').length,
          totalAmount: `₹${sumVal}`
        }))
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load pending list specifically
  async function loadPending() {
    setLoading(true)
    try {
      const response = await listPendingPurchaseOrders()
      setItems(normalizeList(response))
      showToast('Loaded pending purchase orders.')
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

  // Filtered Stock Transfers list
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const medicine = (item?.medicineName || item?.medicine?.name || item?.name || '').toLowerCase()
      const poNum = (item?.poNumber || item?.poNo || item?._id || '').toLowerCase()
      const batch = (item?.batchNo || item?.batchNumber || '').toLowerCase()
      const supplier = (item?.supplierName || item?.supplier?.name || '').toLowerCase()
      const query = search.toLowerCase()
      
      return medicine.includes(query) || poNum.includes(query) || batch.includes(query) || supplier.includes(query)
    })
  }, [items, search])

  // Create Submit Action
  async function handleCreateSubmit(e) {
    e.preventDefault()
    if (!validateCreateForm()) return
    setLoading(true)
    try {
      const uPrice = Number(createForm.unitPrice || 0)
      const qtyVal = Number(createForm.quantity || 1)
      const body = {
        supplierName: createForm.supplierName,
        supplierContact: createForm.supplierContact,
        medicineName: createForm.medicineName,
        batchNo: createForm.batchNo,
        quantity: qtyVal,
        unitPrice: uPrice,
        totalAmount: uPrice * qtyVal,
        paymentStatus: createForm.paymentStatus,
        status: createForm.status
      }
      await createPurchaseOrder(body)
      showToast('Purchase order created successfully!')
      setCreateOpen(false)
      setCreateForm({
        supplierName: '',
        supplierContact: '',
        medicineName: '',
        batchNo: '',
        quantity: '',
        unitPrice: '',
        paymentStatus: 'Unpaid',
        status: 'Pending'
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
      const uPrice = Number(editForm.unitPrice || 0)
      const qtyVal = Number(editForm.quantity || 1)
      const body = {
        supplierName: editForm.supplierName,
        supplierContact: editForm.supplierContact,
        medicineName: editForm.medicineName,
        batchNo: editForm.batchNo,
        quantity: qtyVal,
        unitPrice: uPrice,
        totalAmount: uPrice * qtyVal,
        paymentStatus: editForm.paymentStatus,
        status: editForm.status
      }
      await updatePurchaseOrder(editForm.id, body)
      showToast('Purchase order updated successfully!')
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

  // Action Helpers: Receive & Cancel
  async function handleReceive(id) {
    setLoading(true)
    try {
      await receivePurchaseOrder(id, {})
      showToast('Stock received and inventory values updated!')
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
      await changePurchaseOrderStatus(id, { status: 'Cancelled' })
      showToast('Purchase order cancelled.')
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
      supplierName: item?.supplierName || item?.supplier?.name || '',
      supplierContact: item?.supplierContact || item?.supplier?.phone || '',
      medicineName: item?.medicineName || item?.name || '',
      batchNo: item?.batchNo || item?.batchNumber || '',
      quantity: String(item?.quantity || ''),
      unitPrice: String(item?.unitPrice || ''),
      paymentStatus: item?.paymentStatus || 'Unpaid',
      status: item?.status || 'Pending'
    })
    setEditItem(item)
  }

  async function openView(item) {
    const id = item?._id || item?.id
    try {
      const response = await getPurchaseOrder(id)
      setViewineItem(response?.data || response || item)
    } catch (e) {
      setViewineItem(item)
    }
  }

  // Dynamic getters for columns
  const getSupplierName = (item) => item?.supplierName || item?.supplier?.name || '-'
  const getMedicineName = (item) => item?.medicineName || item?.medicine?.name || item?.name || '-'
  const getBatchNo = (item) => item?.batchNo || item?.batchNumber || '-'
  const getQty = (item) => item?.quantity || item?.qty || 0
  const getAmount = (item) => `₹${item?.amount || item?.totalAmount || item?.total || '0'}`
  const getDate = (item) => {
    const d = item?.createdAt || item?.orderDate || item?.date || '-'
    return d.includes('T') ? d.split('T')[0] : d
  }
  const getExpectedDate = (item) => {
    const d = item?.expectedDeliveryDate || item?.expectedDate || '-'
    return d.includes('T') ? d.split('T')[0] : d
  }
  const getPoNum = (item) => item?.poNumber || item?.poNo || item?._id || '-'

  // Badge Status Class
  const getPaymentBadge = (item) => {
    const status = String(item?.paymentStatus || 'Unpaid').toLowerCase()
    if (status.includes('paid') && !status.includes('un')) return <span className="branch-status active">Paid</span>
    return <span className="branch-status expired">Unpaid</span>
  }

  const getOrderStatusBadge = (item) => {
    const status = String(item?.status || 'Pending').toLowerCase()
    if (status.includes('completed') || status.includes('received')) return <span className="branch-status active">Received</span>
    if (status.includes('cancelled')) return <span className="branch-status expired">Cancelled</span>
    if (status.includes('ordered')) return <span className="branch-status view">Ordered</span>
    if (status.includes('partial')) return <span className="branch-status near-expiry">Partially Received</span>
    return <span className="branch-status near-expiry">Pending</span>
  }

  return (
    <AdminLayout activeLabel="Purchase Orders" title="Purchase Orders" subtitle="Create and manage medicine purchase orders from suppliers.">
      <div className="stock-scroll-area">
        <div className="po-layout-container">

          {/* Workflow Buttons Toolbar */}
          <div className="po-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '8px' }}>
            <div className="po-action-btns">
              <button 
                type="button" 
                className="po-btn po-btn-primary"
                onClick={() => setCreateOpen(true)}
              >
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Purchase Order
              </button>
              <button 
                type="button" 
                className="po-btn po-btn-secondary"
                onClick={refresh}
              >
                View Orders
              </button>
              <button 
                type="button" 
                className="po-btn po-btn-success"
                onClick={refresh}
              >
                Receive Stock
              </button>
              <button 
                type="button" 
                className="po-btn po-btn-primary"
                style={{ background: '#7c3aed', boxShadow: '0 4px 10px reba(124, 58, 237, 0.15)' }}
                onClick={refresh}
              >
                Order Status
              </button>
              <button 
                type="button" 
                className="po-btn po-btn-secondary"
                style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fef3c7' }}
                onClick={loadPending}
              >
                Pending Orders
              </button>
            </div>
            <button 
              type="button" 
              className="po-btn po-btn-secondary"
              onClick={refresh}
            >
              <svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Refresh
            </button>
          </div>

          {/* Summary Cards (6 Equal Sized Cards) */}
          <div className="po-summary-grid">
            <div className="po-summary-card" style={{ '--card-accent': '#2563eb', '--card-bg': '#eff6ff', '--card-border': 'rgba(37, 99, 235, 0.2)' }}>
              <div className="po-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </div>
              <div className="po-summary-info">
                <label>Total POs</label>
                <span>{summary.total}</span>
              </div>
            </div>

            <div className="po-summary-card" style={{ '--card-accent': '#f59e0b', '--card-bg': '#fef3c7', '--card-border': 'rgba(245, 158, 11, 0.2)' }}>
              <div className="po-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="po-summary-info">
                <label>Pending</label>
                <span>{summary.pending}</span>
              </div>
            </div>

            <div className="po-summary-card" style={{ '--card-accent': '#0ea5e9', '--card-bg': '#e0f2fe', '--card-border': 'rgba(14, 165, 233, 0.2)' }}>
              <div className="po-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m14.5 4.5 5 5a4.24 4.24 0 0 1-6 6l-5-5a4.24 4.24 0 0 1 6-6Z"/>
                </svg>
              </div>
              <div className="po-summary-info">
                <label>Ordered</label>
                <span>{summary.ordered}</span>
              </div>
            </div>

            <div className="po-summary-card" style={{ '--card-accent': '#eab308', '--card-bg': '#fefce8', '--card-border': 'rgba(234, 179, 8, 0.2)' }}>
              <div className="po-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className="po-summary-info">
                <label>Partial Recv</label>
                <span>{summary.partial}</span>
              </div>
            </div>

            <div className="po-summary-card" style={{ '--card-accent': '#10b981', '--card-bg': '#ecfdf5', '--card-border': 'rgba(16, 185, 129, 0.2)' }}>
              <div className="po-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="po-summary-info">
                <label>Fully Recv</label>
                <span>{summary.received}</span>
              </div>
            </div>

            <div className="po-summary-card" style={{ '--card-accent': '#059669', '--card-bg': '#d1fae5', '--card-border': 'rgba(5, 150, 105, 0.2)' }}>
              <div className="po-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="po-summary-info">
                <label style={{ color: '#059669' }}>Purchase Amount</label>
                <span style={{ color: '#059669' }}>{summary.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Search Inputs */}
          <div className="po-toolbar">
            <div className="po-search-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search PO number, supplier, medicine, batch..." 
              />
            </div>
          </div>

          {/* Table Results */}
          <section className="dispense-table-panel">
            <h2>Purchase Records</h2>
            
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
                      <th>PO Number</th>
                      <th>Supplier</th>
                      <th>Order Date</th>
                      <th>Expected Date</th>
                      <th>Medicine Details</th>
                      <th>Total Amount</th>
                      <th>Payment Status</th>
                      <th>Order Status</th>
                      <th style={{ width: '180px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length ? filteredItems.map((item, index) => (
                      <tr key={getId(item, index)}>
                        <td><code>{getPoNum(item)}</code></td>
                        <td>{getSupplierName(item)}</td>
                        <td>{getDate(item)}</td>
                        <td>{getExpectedDate(item)}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{getMedicineName(item)}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Batch: {getBatchNo(item)} | Qty: {getQty(item)}</div>
                        </td>
                        <td>{getAmount(item)}</td>
                        <td>{getPaymentBadge(item)}</td>
                        <td>{getOrderStatusBadge(item)}</td>
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
                              style={{ color: '#10b981', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                              aria-label="Receive Stock" 
                              title="Receive Stock"
                              onClick={() => handleReceive(item?._id || item?.id)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button daneer" 
                              aria-label="Cancel Order" 
                              title="Cancel Order"
                              onClick={() => handleCancel(item?._id || item?.id)}
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
                            <h3>No purchase orders found.</h3>
                            <p>Create a purchase order to start managing pharmacy stock purchases.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Modal 1: Create PO */}
          {createOpen && (
            <div className="po-modal-overlay">
              <form onSubmit={handleCreateSubmit} className="po-modal-container" noValidate>
                <div className="po-modal-header">
                  <h2>Create New Purchase Order</h2>
                  <button type="button" className="po-modal-close" onClick={() => setCreateOpen(false)}>&times;</button>
                </div>
                <div className="po-modal-body">
                  <div className="po-detail-row">
                    <div className="po-form-group">
                      <label>Supplier Name *</label>
                      <input 
                        type="text" 
                        id="create-supplierName"
                        value={createForm.supplierName} 
                        onChange={(e) => {
                          setCreateForm({...createForm, supplierName: e.target.value})
                          if (createErrors.supplierName) setCreateErrors({...createErrors, supplierName: ''})
                        }} 
                        style={createErrors.supplierName ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {createErrors.supplierName && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.supplierName}</span>
                      )}
                    </div>
                    <div className="po-form-group">
                      <label>Supplier Contact Phone *</label>
                      <input 
                        type="text" 
                        id="create-supplierContact"
                        value={createForm.supplierContact} 
                        onChange={(e) => {
                          setCreateForm({...createForm, supplierContact: e.target.value})
                          if (createErrors.supplierContact) setCreateErrors({...createErrors, supplierContact: ''})
                        }} 
                        style={createErrors.supplierContact ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {createErrors.supplierContact && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.supplierContact}</span>
                      )}
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-form-group">
                      <label>Medicine Name *</label>
                      <input 
                        type="text" 
                        id="create-medicineName"
                        value={createForm.medicineName} 
                        onChange={(e) => {
                          setCreateForm({...createForm, medicineName: e.target.value})
                          if (createErrors.medicineName) setCreateErrors({...createErrors, medicineName: ''})
                        }} 
                        style={createErrors.medicineName ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {createErrors.medicineName && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.medicineName}</span>
                      )}
                    </div>
                    <div className="po-form-group">
                      <label>Batch Number *</label>
                      <input 
                        type="text" 
                        id="create-batchNo"
                        value={createForm.batchNo} 
                        onChange={(e) => {
                          setCreateForm({...createForm, batchNo: e.target.value})
                          if (createErrors.batchNo) setCreateErrors({...createErrors, batchNo: ''})
                        }} 
                        style={createErrors.batchNo ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {createErrors.batchNo && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.batchNo}</span>
                      )}
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-form-group">
                      <label>Order Quantity *</label>
                      <input 
                        type="number" 
                        id="create-quantity"
                        value={createForm.quantity} 
                        onChange={(e) => {
                          setCreateForm({...createForm, quantity: e.target.value})
                          if (createErrors.quantity) setCreateErrors({...createErrors, quantity: ''})
                        }} 
                        style={createErrors.quantity ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {createErrors.quantity && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.quantity}</span>
                      )}
                    </div>
                    <div className="po-form-group">
                      <label>Unit Price (₹) *</label>
                      <input 
                        type="number" 
                        id="create-unitPrice"
                        value={createForm.unitPrice} 
                        onChange={(e) => {
                          setCreateForm({...createForm, unitPrice: e.target.value})
                          if (createErrors.unitPrice) setCreateErrors({...createErrors, unitPrice: ''})
                        }} 
                        style={createErrors.unitPrice ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {createErrors.unitPrice && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{createErrors.unitPrice}</span>
                      )}
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-form-group">
                      <label>Payment Status</label>
                      <select 
                        value={createForm.paymentStatus} 
                        onChange={(e) => setCreateForm({...createForm, paymentStatus: e.target.value})}
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                    <div className="po-form-group">
                      <label>Order Status</label>
                      <select 
                        value={createForm.status} 
                        onChange={(e) => setCreateForm({...createForm, status: e.target.value})}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ordered">Ordered</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="po-modal-footer">
                  <button type="button" className="po-btn po-btn-secondary" onClick={() => setCreateOpen(false)} disabled={loading}>Cancel</button>
                  <button type="submit" className="po-btn po-btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Purchase Order'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 2: Edit PO */}
          {editItem && (
            <div className="po-modal-overlay">
              <form onSubmit={handleUpdateSubmit} className="po-modal-container" noValidate>
                <div className="po-modal-header">
                  <h2>Update Purchase Order: {getPoNum(editItem)}</h2>
                  <button type="button" className="po-modal-close" onClick={() => setEditItem(null)}>&times;</button>
                </div>
                <div className="po-modal-body">
                  <div className="po-detail-row">
                    <div className="po-form-group">
                      <label>Supplier Name *</label>
                      <input 
                        type="text" 
                        id="edit-supplierName"
                        value={editForm.supplierName} 
                        onChange={(e) => {
                          setEditForm({...editForm, supplierName: e.target.value})
                          if (editErrors.supplierName) setEditErrors({...editErrors, supplierName: ''})
                        }} 
                        style={editErrors.supplierName ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {editErrors.supplierName && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.supplierName}</span>
                      )}
                    </div>
                    <div className="po-form-group">
                      <label>Supplier Contact Phone *</label>
                      <input 
                        type="text" 
                        id="edit-supplierContact"
                        value={editForm.supplierContact} 
                        onChange={(e) => {
                          setEditForm({...editForm, supplierContact: e.target.value})
                          if (editErrors.supplierContact) setEditErrors({...editErrors, supplierContact: ''})
                        }} 
                        style={editErrors.supplierContact ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {editErrors.supplierContact && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.supplierContact}</span>
                      )}
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-form-group">
                      <label>Medicine Name *</label>
                      <input 
                        type="text" 
                        id="edit-medicineName"
                        value={editForm.medicineName} 
                        onChange={(e) => {
                          setEditForm({...editForm, medicineName: e.target.value})
                          if (editErrors.medicineName) setEditErrors({...editErrors, medicineName: ''})
                        }} 
                        style={editErrors.medicineName ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {editErrors.medicineName && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.medicineName}</span>
                      )}
                    </div>
                    <div className="po-form-group">
                      <label>Batch Number *</label>
                      <input 
                        type="text" 
                        id="edit-batchNo"
                        value={editForm.batchNo} 
                        onChange={(e) => {
                          setEditForm({...editForm, batchNo: e.target.value})
                          if (editErrors.batchNo) setEditErrors({...editErrors, batchNo: ''})
                        }} 
                        style={editErrors.batchNo ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {editErrors.batchNo && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.batchNo}</span>
                      )}
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-form-group">
                      <label>Order Quantity *</label>
                      <input 
                        type="number" 
                        id="edit-quantity"
                        value={editForm.quantity} 
                        onChange={(e) => {
                          setEditForm({...editForm, quantity: e.target.value})
                          if (editErrors.quantity) setEditErrors({...editErrors, quantity: ''})
                        }} 
                        style={editErrors.quantity ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {editErrors.quantity && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.quantity}</span>
                      )}
                    </div>
                    <div className="po-form-group">
                      <label>Unit Price (₹) *</label>
                      <input 
                        type="number" 
                        id="edit-unitPrice"
                        value={editForm.unitPrice} 
                        onChange={(e) => {
                          setEditForm({...editForm, unitPrice: e.target.value})
                          if (editErrors.unitPrice) setEditErrors({...editErrors, unitPrice: ''})
                        }} 
                        style={editErrors.unitPrice ? { borderColor: '#ef4444' } : {}}
                        required 
                      />
                      {editErrors.unitPrice && (
                        <span className="form-error-msg" style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{editErrors.unitPrice}</span>
                      )}
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-form-group">
                      <label>Payment Status</label>
                      <select 
                        value={editForm.paymentStatus} 
                        onChange={(e) => setEditForm({...editForm, paymentStatus: e.target.value})}
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                    <div className="po-form-group">
                      <label>Order Status</label>
                      <select 
                        value={editForm.status} 
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Partially Received">Partially Received</option>
                        <option value="Received">Received</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="po-modal-footer">
                  <button type="button" className="po-btn po-btn-secondary" onClick={() => setEditItem(null)} disabled={loading}>Cancel</button>
                  <button type="submit" className="po-btn po-btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Order'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 3: View Details */}
          {viewingItem && (
            <div className="po-modal-overlay">
              <div className="po-modal-container">
                <div className="po-modal-header">
                  <h2>Purchase Order Details: {getPoNum(viewingItem)}</h2>
                  <button type="button" className="po-modal-close" onClick={() => setViewineItem(null)}>&times;</button>
                </div>
                <div className="po-modal-body">
                  <div className="po-detail-row">
                    <div className="po-detail-item">
                      <label>Supplier Name</label>
                      <span>{getSupplierName(viewingItem)}</span>
                    </div>
                    <div className="po-detail-item">
                      <label>Supplier Contact</label>
                      <span>{viewingItem?.supplierContact || viewingItem?.supplier?.phone || '-'}</span>
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-detail-item">
                      <label>Order Date</label>
                      <span>{getDate(viewingItem)}</span>
                    </div>
                    <div className="po-detail-item">
                      <label>Expected Delivery Date</label>
                      <span>{getExpectedDate(viewingItem)}</span>
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-detail-item">
                      <label>Medicine Name</label>
                      <span>{getMedicineName(viewingItem)}</span>
                    </div>
                    <div className="po-detail-item">
                      <label>Batch Number</label>
                      <span><code>{getBatchNo(viewingItem)}</code></span>
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-detail-item">
                      <label>Quantity</label>
                      <span>{getQty(viewingItem)} units</span>
                    </div>
                    <div className="po-detail-item">
                      <label>Unit Price</label>
                      <span>₹{viewingItem?.unitPrice || 0}</span>
                    </div>
                  </div>
                  <div className="po-detail-row">
                    <div className="po-detail-item">
                      <label>Total Amount</label>
                      <span>{getAmount(viewingItem)}</span>
                    </div>
                    <div className="po-detail-item">
                      <label>Payment Status</label>
                      <div>{getPaymentBadge(viewingItem)}</div>
                    </div>
                  </div>
                  <div className="po-detail-item">
                    <label>Order Status</label>
                    <div style={{ marginTop: '4px' }}>{getOrderStatusBadge(viewingItem)}</div>
                  </div>
                </div>
                <div className="po-modal-footer">
                  <button type="button" className="po-btn po-btn-primary" onClick={() => setViewineItem(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  )
}
