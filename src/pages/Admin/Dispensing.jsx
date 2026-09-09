import { useEffect, useState, useMemo } from 'react'
import { useToast } from '../../components/ToastProvider'
import AdminLayout from './AdminLayout'
import { 
  dispensePrescription, 
  generateBill, 
  getInvoice, 
  getPendingPharmacyPrescriptions,
  getPharmacyDispensingOverview, 
  getPharmacyPrescription, 
  recordPayment,
  getPharmacyAdminDashboard,
  listBills,
  getPharmacyPayments
} from '../../config/api'
import './Dispensing.css'

function readStoredValue(key) {
  const value = sessionStorage.getItem(key) || localStorage.getItem(key)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const normalizeList = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.prescriptions)) return response.prescriptions
  if (Array.isArray(response?.bills)) return response.bills
  if (Array.isArray(response?.payments)) return response.payments
  return []
}

export default function Dispensing() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState('prescriptions') // prescriptions, dispense, bill, invoices, payments
  
  // Dashboard summary metrics
  const [summary, setSummary] = useState({
    pendingPrescriptions: '0',
    todayDispensing: '0',
    pendingBills: '0',
    paidBills: '0',
    todayRevenue: '0'
  })

  // Load summary metrics from Dashboard data
  async function loadSummary() {
    try {
      const response = await getPharmacyAdminDashboard()
      const data = response?.data || response || {}
      setSummary({
        pendingPrescriptions: String(data?.pendingPrescriptions || data?.pendingPrescriptionsCount || '0'),
        todayDispensing: String(data?.todayDispensed || data?.dispensedCount || '0'),
        pendingBills: String(data?.pendingBills || data?.unpaidBillsCount || '0'),
        paidBills: String(data?.paidBills || data?.paidBillsCount || '0'),
        todayRevenue: `₹${data?.todayRevenue || data?.revenue || '0'}`
      })
    } catch (e) {
      console.log('Unable to load billing summary details:', e.message)
    }
  }

  // Load the active tab data
  async function loadActiveTab(workflow = activeWorkflow) {
    setLoading(true)
    setActiveWorkflow(workflow)
    try {
      let response
      if (workflow === 'prescriptions') {
        response = await getPendingPharmacyPrescriptions()
      } else if (workflow === 'dispense') {
        response = await getPharmacyDispensingOverview()
      } else if (workflow === 'bill' || workflow === 'invoices') {
        response = await listBills()
      } else if (workflow === 'payments') {
        response = await getPharmacyPayments()
      }
      setItems(normalizeList(response))
    } catch (error) {
      showToast(error.message, 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
    loadActiveTab('prescriptions')
  }, [])

  // Filtered list based on Search query
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const pName = (item?.patientName || item?.patient?.name || item?.patient || '').toLowerCase()
      const rxId = (item?.prescriptionId || item?.rxNo || item?._id || '').toLowerCase()
      const billId = (item?.billNo || item?.invoiceNumber || '').toLowerCase()
      const query = search.toLowerCase()
      
      return pName.includes(query) || rxId.includes(query) || billId.includes(query)
    })
  }, [items, search])

  // Click handler for Actions column functions
  async function handleView(item) {
    const id = item?.prescriptionId || item?.rxNo || item?._id
    showToast(`Viewing prescription: ${id}`)
    try {
      const response = await getPharmacyPrescription(id)
      showToast(`Loaded: ${response?.data?.patientName || 'Details'}`)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleDispense(item) {
    setLoading(true)
    try {
      const id = item?.prescriptionId || item?._id
      const response = await dispensePrescription({ prescriptionId: id })
      showToast(response?.message || 'Medicine dispensed successfully!')
      await loadActiveTab()
      loadSummary()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateBill(item) {
    setLoading(true)
    try {
      const id = item?.prescriptionId || item?._id
      const response = await generateBill({ prescriptionId: id })
      showToast(response?.message || 'Bill generated successfully!')
      await loadActiveTab('invoices')
      loadSummary()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvoice(item) {
    const billId = item?._id || item?.id
    showToast(`Downloading invoice ${billId}...`)
    try {
      const response = await getInvoice(billId)
      showToast(`Invoice loaded: ${response?.data?.invoiceNumber || 'Completed'}`)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handlePayment(item) {
    setLoading(true)
    try {
      const id = item?._id || item?.id
      const response = await recordPayment({ billId: id, amount: item?.amount || item?.totalPrice || 100, method: 'cash' })
      showToast(response?.message || 'Payment recorded successfully!')
      await loadActiveTab('payments')
      loadSummary()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Helpers to retrieve formatting values dynamically
  const getPatientName = (item) => item?.patientName || item?.patient?.name || item?.patient || '-'
  const getRxId = (item) => item?.prescriptionId || item?.rxNo || item?.billNo || item?.invoiceNumber || item?._id || '-'
  const getMedicineNames = (item) => {
    if (Array.isArray(item?.medicines)) {
      return item.medicines.map(m => m.medicineName || m.name || m).join(', ')
    }
    return item?.medicineName || item?.medicine || '-'
  }
  const getQty = (item) => {
    if (Array.isArray(item?.medicines)) {
      return item.medicines.map(m => Number(m.quantity || m.qty || 0)).reduce((a, b) => a + b, 0)
    }
    return item?.quantity || item?.qty || 1
  }
  const getAmount = (item) => `₹${item?.amount || item?.totalPrice || item?.total || '0'}`
  const getDate = (item) => {
    const d = item?.createdAt || item?.date || '-'
    return d.includes('T') ? d.split('T')[0] : d
  }

  // Get status badge templates
  const getPaymentBadge = (item) => {
    const status = String(item?.paymentStatus || item?.payment || 'Unpaid').toLowerCase()
    if (status.includes('paid') && !status.includes('un')) {
      return <span className="branch-status active">Paid</span>
    }
    return <span className="branch-status expired">Unpaid</span>
  }

  const getDispenseBadge = (item) => {
    const status = String(item?.dispensingStatus || item?.status || 'Pending').toLowerCase()
    if (status.includes('completed') || status.includes('dispensed')) {
      return <span className="branch-status view">Dispensed</span>
    }
    if (status.includes('cancelled')) {
      return <span className="branch-status expired">Cancelled</span>
    }
    return <span className="branch-status near-expiry">Pending</span>
  }

  return (
    <AdminLayout activeLabel="Dispensing" title="Dispensing & Billing" subtitle="Manage prescriptions, medicine dispensing, invoices, and payments.">
      <div className="stock-scroll-area">
        <div className="dispense-layout-container">

          {/* Workflow Tabs (Spaced Card Buttons) */}
          <div className="dispense-workflow-cards-grid">
            <button 
              type="button" 
              className={`dispense-workflow-card ${activeWorkflow === 'prescriptions' ? 'active' : ''}`}
              style={{ '--card-accent': '#2563eb', '--card-bg': '#eff6ff', '--card-border': 'rgba(37, 99, 235, 0.25)' }}
              onClick={() => loadActiveTab('prescriptions')}
            >
              <div className="dispense-card-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div className="dispense-card-text">
                <span>Prescriptions</span>
                <small>Rx Queue</small>
              </div>
            </button>

            <button 
              type="button" 
              className={`dispense-workflow-card ${activeWorkflow === 'dispense' ? 'active' : ''}`}
              style={{ '--card-accent': '#0ea5e9', '--card-bg': '#e0f2fe', '--card-border': 'rgba(14, 165, 233, 0.25)' }}
              onClick={() => loadActiveTab('dispense')}
            >
              <div className="dispense-card-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m14.5 4.5 5 5a4.24 4.24 0 0 1-6 6l-5-5a4.24 4.24 0 0 1 6-6Z"/>
                  <path d="m10 9 5 5"/>
                </svg>
              </div>
              <div className="dispense-card-text">
                <span>Dispense Medicine</span>
                <small>Fulfill Rx</small>
              </div>
            </button>

            <button 
              type="button" 
              className={`dispense-workflow-card ${activeWorkflow === 'bill' ? 'active' : ''}`}
              style={{ '--card-accent': '#f59e0b', '--card-bg': '#fef3c7', '--card-border': 'rgba(245, 158, 11, 0.25)' }}
              onClick={() => loadActiveTab('bill')}
            >
              <div className="dispense-card-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="dispense-card-text">
                <span>Generate Bill</span>
                <small>Create Invoice</small>
              </div>
            </button>

            <button 
              type="button" 
              className={`dispense-workflow-card ${activeWorkflow === 'invoices' ? 'active' : ''}`}
              style={{ '--card-accent': '#8b5cf6', '--card-bg': '#f3e8ff', '--card-border': 'rgba(139, 92, 246, 0.25)' }}
              onClick={() => loadActiveTab('invoices')}
            >
              <div className="dispense-card-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="dispense-card-text">
                <span>Invoices</span>
                <small>Billing Records</small>
              </div>
            </button>

            <button 
              type="button" 
              className={`dispense-workflow-card ${activeWorkflow === 'payments' ? 'active' : ''}`}
              style={{ '--card-accent': '#10b981', '--card-bg': '#ecfdf5', '--card-border': 'rgba(16, 185, 129, 0.25)' }}
              onClick={() => loadActiveTab('payments')}
            >
              <div className="dispense-card-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                  <circle cx="12" cy="15" r="2"/>
                </svg>
              </div>
              <div className="dispense-card-text">
                <span>Payments</span>
                <small>Record Payment</small>
              </div>
            </button>
          </div>

          {/* Billing Summary Cards (5 Equal Sized Cards) */}
          <div className="dispense-summary-grid">
            <div className="dispense-summary-card" style={{ '--card-accent': '#2563eb', '--card-bg': '#eff6ff', '--card-border': 'rgba(37, 99, 235, 0.2)' }}>
              <div className="dispense-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                </svg>
              </div>
              <div className="dispense-summary-info">
                <label>Pending Prescriptions</label>
                <span>{summary.pendingPrescriptions}</span>
              </div>
            </div>

            <div className="dispense-summary-card" style={{ '--card-accent': '#0ea5e9', '--card-bg': '#e0f2fe', '--card-border': 'rgba(14, 165, 233, 0.2)' }}>
              <div className="dispense-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m14.5 4.5 5 5a4.24 4.24 0 0 1-6 6l-5-5a4.24 4.24 0 0 1 6-6Z"/>
                </svg>
              </div>
              <div className="dispense-summary-info">
                <label>Today's Dispensing</label>
                <span>{summary.todayDispensing}</span>
              </div>
            </div>

            <div className="dispense-summary-card" style={{ '--card-accent': '#f59e0b', '--card-bg': '#fef3c7', '--card-border': 'rgba(245, 158, 11, 0.2)' }}>
              <div className="dispense-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="dispense-summary-info">
                <label>Pending Bills</label>
                <span>{summary.pendingBills}</span>
              </div>
            </div>

            <div className="dispense-summary-card" style={{ '--card-accent': '#8b5cf6', '--card-bg': '#f3e8ff', '--card-border': 'rgba(139, 92, 246, 0.2)' }}>
              <div className="dispense-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="dispense-summary-info">
                <label>Paid Bills</label>
                <span>{summary.paidBills}</span>
              </div>
            </div>

            <div className="dispense-summary-card" style={{ '--card-accent': '#10b981', '--card-bg': '#ecfdf5', '--card-border': 'rgba(16, 185, 129, 0.2)' }}>
              <div className="dispense-summary-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="dispense-summary-info">
                <label style={{ color: '#10b981' }}>Today's Revenue</label>
                <span style={{ color: '#10b981' }}>{summary.todayRevenue}</span>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="dispense-search-row">
            <div className="dispense-search-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search prescription, patient, invoice..." 
              />
            </div>
            <div className="dispense-btn-group">
              <button 
                type="button" 
                className="dispense-btn-secondary"
                onClick={() => {
                  loadSummary()
                  loadActiveTab(activeWorkflow)
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Results Table Panel */}
          <section className="dispense-table-panel">
            <h2>Workflow Records</h2>
            
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
                      <th>Patient</th>
                      <th>Prescription ID</th>
                      <th>Medicine</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Payment Status</th>
                      <th>Dispensing Status</th>
                      <th>Date</th>
                      <th style={{ width: '180px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length ? filteredItems.map((item, index) => (
                      <tr key={item?._id || item?.id || index}>
                        <td><div style={{ fontWeight: 600, color: '#1e293b' }}>{getPatientName(item)}</div></td>
                        <td><code>{getRxId(item)}</code></td>
                        <td>{getMedicineNames(item)}</td>
                        <td>{getQty(item)}</td>
                        <td>{getAmount(item)}</td>
                        <td>{getPaymentBadge(item)}</td>
                        <td>{getDispenseBadge(item)}</td>
                        <td>{getDate(item)}</td>
                        <td>
                          <div className="admin-action-group">
                            <button 
                              type="button" 
                              className="admin-action-button view" 
                              aria-label="View Details" 
                              title="View Details"
                              onClick={() => handleView(item)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button edit" 
                              aria-label="Dispense Medicine" 
                              title="Dispense Medicine"
                              onClick={() => handleDispense(item)}
                            >
                              <svg viewBox="0 0 24 24"><path d="m14.5 4.5 5 5a4.24 4.24 0 0 1-6 6l-5-5a4.24 4.24 0 0 1 6-6Z"/><path d="m10 9 5 5"/></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button edit" 
                              aria-label="Generate Bill" 
                              title="Generate Bill"
                              onClick={() => handleGenerateBill(item)}
                            >
                              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button view" 
                              aria-label="Get Invoice" 
                              title="Get Invoice"
                              onClick={() => handleInvoice(item)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button assign" 
                              aria-label="Record Payment" 
                              title="Record Payment"
                              onClick={() => handlePayment(item)}
                            >
                              <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/><circle cx="12" cy="15" r="2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="9">
                          <div className="dispense-empty-state">
                            <h3>No dispensing or billing records found.</h3>
                            <p>Records will appear here when prescriptions are available.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </div>
    </AdminLayout>
  )
}
