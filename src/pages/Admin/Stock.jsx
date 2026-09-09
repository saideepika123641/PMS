import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import AdminLayout from './AdminLayout'
import { 
  addInventoryStock,
  adjustInventoryWithReason,
  disposeInventoryBatch,
  getInventory,
  getInventoryBatch,
  getInventorySummary,
  getInventoryTransactions,
  getInventoryValuation,
  getMedicineBatches,
  getLowStockInventory,
  getMedicineStock,
  getNearExpiryInventory,
  getOutOfStockInventory,
  quarantineInventoryBatch,
  updateInventoryLevels,
  getPharmacyAdminDashboard
} from '../../config/api'
import './Stock.css'

const SUMMARY_CARDS = [
  {
    id: 'totalMedicines',
    label: 'TOTAL MEDICINES',
    metricKey: 'totalMedicines',
    route: '/inventory',
    view: 'inventory',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: 'rgba(37, 99, 235, 0.2)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m10.5 11.5 5 5m-2.5-9L8 12.5a4.24 4.24 0 0 0 6 6l5-5a4.24 4.24 0 0 0-6-6Z"/>
      </svg>
    )
  },
  {
    id: 'totalStock',
    label: 'TOTAL STOCK',
    metricKey: 'totalStock',
    route: '/inventory',
    view: 'inventory',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    borderColor: 'rgba(14, 165, 233, 0.2)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.29 7 12 12 20.71 7"/>
        <line x1="12" y1="22" x2="12" y2="12"/>
      </svg>
    )
  },
  {
    id: 'lowStock',
    label: 'LOW STOCK',
    metricKey: 'lowStock',
    route: '/low-stock',
    view: 'low',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )
  },
  {
    id: 'nearExpiry',
    label: 'NEAR EXPIRY',
    metricKey: 'nearExpiry',
    route: '/near-expiry',
    view: 'near',
    color: '#f97316',
    bgColor: '#ffedd5',
    borderColor: 'rgba(249, 115, 22, 0.2)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    )
  },
  {
    id: 'expired',
    label: 'EXPIRED',
    metricKey: 'expired',
    route: '/expired',
    view: 'expired',
    color: '#ef4444',
    bgColor: '#fee2e2',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <path d="m14 14-4 4m0-4 4 4"/>
      </svg>
    )
  }
]

const NAV_TABS = [
  {
    key: 'inventory',
    label: 'Inventory',
    route: '/inventory',
    color: '#2563eb',
    bgColor: '#eff6ff',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.29 7 12 12 20.71 7"/>
        <line x1="12" y1="22" x2="12" y2="12"/>
      </svg>
    )
  },
  {
    key: 'summary',
    label: 'Stock Summary',
    route: '/stock-summary',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    )
  },
  {
    key: 'transactions',
    label: 'Transactions',
    route: '/transactions',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>
      </svg>
    )
  },
  {
    key: 'valuation',
    label: 'Valuation',
    route: '/valuation',
    color: '#ec4899',
    bgColor: '#fce7f3',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12M6 8h12M6 13h8.5a4.5 4.5 0 0 1 0 9H6M14.5 13l-9 9"/>
      </svg>
    )
  }
]

export default function Stock({ initialView }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const getViewFromPath = () => {
    const path = location.pathname
    if (path.includes('low-stock')) return 'low'
    if (path.includes('near-expiry')) return 'near'
    if (path.includes('out-of-stock')) return 'out'
    if (path.includes('stock-summary')) return 'summary'
    if (path.includes('transactions')) return 'transactions'
    if (path.includes('valuation')) return 'valuation'
    if (path.includes('expired')) return 'expired'
    if (path.includes('inventory')) return 'inventory'
    return initialView || 'inventory'
  }

  const [view, setView] = useState(getViewFromPath) // inventory, low, near, out, summary, transactions, valuation
  const [items, setItems] = useState([])
  const [summaryData, setSummaryData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiryFilter, setExpiryFilter] = useState('all')
  
  // Modals state
  const [addStockOpen, setAddStockOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [levelsOpen, setLevelsOpen] = useState(false)
  const [viewingItem, setViewingItem] = useState(null)
  
  // General Dashboard totals
  const [metrics, setMetrics] = useState({
    totalMedicines: 0,
    totalStock: 0,
    lowStock: 0,
    nearExpiry: 0,
    expired: 0
  })

  // Add Stock Form
  const [stockForm, setStockForm] = useState({
    medicineId: '',
    batchNo: '',
    quantity: '',
    expiryDate: '',
    costPrice: '',
    sellingPrice: '',
    supplier: '',
    purchaseDate: '',
    notes: ''
  })

  // Adjust Stock Form
  const [adjustmentForm, setAdjustmentForm] = useState({
    medicineId: '',
    batchId: '',
    quantity: '',
    type: 'increase',
    reason: '',
    notes: ''
  })

  // Stock Levels Form
  const [levelsForm, setLevelsForm] = useState({
    medicineId: '',
    minimumStock: '',
    maximumStock: '',
    reorderLevel: ''
  })

  async function loadSummaryMetrics() {
    try {
      const response = await getPharmacyAdminDashboard()
      const data = response?.data || response || {}
      setMetrics({
        totalMedicines: Number(data?.totalMedicines || data?.medicinesCount || 0),
        totalStock: Number(data?.totalStock || data?.totalInventoryQty || 0),
        lowStock: Number(data?.lowStockMedicines || data?.lowStockCount || 0),
        nearExpiry: Number(data?.nearExpiryBatches || data?.nearExpiryCount || 0),
        expired: Number(data?.expiredBatches || data?.expiredCount || 0)
      })
    } catch (e) {
      console.log('Unable to load Stock metrics:', e.message)
    }
  }

  async function load(nextView = view) {
    setLoading(true)
    setView(nextView)
    try {
      const loaders = {
        inventory: getInventory,
        low: getLowStockInventory,
        near: getNearExpiryInventory,
        out: getOutOfStockInventory,
        summary: getInventorySummary,
        transactions: getInventoryTransactions,
        valuation: getInventoryValuation,
      }
      const response = await loaders[nextView]()
      if (nextView === 'summary' || nextView === 'valuation') {
        setSummaryData(response?.data || response)
        setItems([])
      } else {
        setItems(normalizeList(response))
        setSummaryData(null)
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleNavigate(route, targetView) {
    setView(targetView)
    load(targetView)
    if (location.pathname !== route) {
      navigate(route)
    }
  }

  useEffect(() => {
    const target = getViewFromPath()
    loadSummaryMetrics()
    load(target)
  }, [location.pathname])

  // Filtered Inventory list
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = (item?.medicineName || item?.medicine?.name || item?.name || '').toLowerCase()
      const batch = (item?.batchNo || item?.batchNumber || item?.batchId || '').toLowerCase()
      const query = search.toLowerCase()
      
      const matchesSearch = name.includes(query) || batch.includes(query)
      
      const itemStatus = String(item?.status || 'In Stock').toLowerCase()
      const matchesStatus = statusFilter === 'all' || itemStatus.includes(statusFilter.toLowerCase())
      
      const daysLeft = Number(item?.daysLeft ?? 999)
      let matchesExpiry = true
      if (expiryFilter === 'expired') matchesExpiry = daysLeft <= 0
      if (expiryFilter === 'near') matchesExpiry = daysLeft > 0 && daysLeft <= 30
      if (expiryFilter === 'safe') matchesExpiry = daysLeft > 30
      
      return matchesSearch && matchesStatus && matchesExpiry
    })
  }, [items, search, statusFilter, expiryFilter])

  // Form Submissions
  async function handleAddStockSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        medicineId: stockForm.medicineId,
        batchNo: stockForm.batchNo,
        quantity: Number(stockForm.quantity),
        expiryDate: stockForm.expiryDate,
        costPrice: stockForm.costPrice ? Number(stockForm.costPrice) : undefined,
        sellingPrice: stockForm.sellingPrice ? Number(stockForm.sellingPrice) : undefined,
        supplier: stockForm.supplier || undefined,
        purchaseDate: stockForm.purchaseDate || undefined,
        notes: stockForm.notes || undefined
      }
      const response = await addInventoryStock(body)
      showToast(response?.message || 'Stock added successfully!')
      setAddStockOpen(false)
      setStockForm({
        medicineId: '',
        batchNo: '',
        quantity: '',
        expiryDate: '',
        costPrice: '',
        sellingPrice: '',
        supplier: '',
        purchaseDate: '',
        notes: ''
      })
      await load(view)
      loadSummaryMetrics()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdjustSubmit(e) {
    e.preventDefault()
    
    if (adjustmentForm.type === 'decrease') {
      if (!window.confirm('Are you sure you want to decrease stock levels? This will impact availability.')) {
        return
      }
    }

    setLoading(true)
    try {
      const body = {
        medicineId: adjustmentForm.medicineId,
        batchId: adjustmentForm.batchId || undefined,
        quantity: Number(adjustmentForm.quantity),
        type: adjustmentForm.type,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes || undefined
      }
      const response = await adjustInventoryWithReason(body)
      showToast(response?.message || 'Stock levels adjusted successfully!')
      setAdjustOpen(false)
      setAdjustmentForm({
        medicineId: '',
        batchId: '',
        quantity: '',
        type: 'increase',
        reason: '',
        notes: ''
      })
      await load(view)
      loadSummaryMetrics()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleLevelsSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await updateInventoryLevels(levelsForm.medicineId, {
        minimumStock: Number(levelsForm.minimumStock),
        maximumStock: Number(levelsForm.maximumStock),
        reorderLevel: Number(levelsForm.reorderLevel)
      })
      showToast(response?.message || 'Stock levels configured successfully!')
      setLevelsOpen(false)
      setLevelsForm({
        medicineId: '',
        minimumStock: '',
        maximumStock: '',
        reorderLevel: ''
      })
      await load(view)
      loadSummaryMetrics()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Action Triggers: Dispose & Quarantine
  async function handleDispose(batchNo) {
    if (!window.confirm(`Are you sure you want to dispose batch: ${batchNo}?`)) return
    setLoading(true)
    try {
      const response = await disposeInventoryBatch(batchNo, { reason: 'Expired stock disposal' })
      showToast(response?.message || 'Batch disposed successfully.')
      await load(view)
      loadSummaryMetrics()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleQuarantine(batchNo) {
    if (!window.confirm(`Are you sure you want to quarantine batch: ${batchNo}?`)) return
    setLoading(true)
    try {
      const response = await quarantineInventoryBatch(batchNo, { quarantined: true })
      showToast(response?.message || 'Batch quarantined successfully.')
      await load(view)
      loadSummaryMetrics()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Prefill helper function for adjustments
  function prefillAdjustment(item) {
    setAdjustmentForm({
      medicineId: item?.medicineId || item?._id || item?.id || '',
      batchId: item?.batchNo || item?.batchNumber || '',
      quantity: '',
      type: 'increase',
      reason: '',
      notes: ''
    })
    setAdjustOpen(true)
  }

  // Prefill helper for levels configuration
  function prefillLevels(item) {
    setLevelsForm({
      medicineId: item?.medicineId || item?._id || item?.id || '',
      minimumStock: String(item?.minimumStock || item?.minStock || ''),
      maximumStock: String(item?.maximumStock || item?.maxStock || ''),
      reorderLevel: String(item?.reorderLevel || '')
    })
    setLevelsOpen(true)
  }

  // Dynamic getters for columns
  const getMedicineName = (item) => item?.medicineName || item?.medicine?.name || item?.name || '-'
  const getBatchNo = (item) => item?.batchNo || item?.batchNumber || '-'
  const getQty = (item) => item?.quantity || item?.stock || item?.qty || 0
  const getMinStock = (item) => item?.minimumStock ?? item?.minStock ?? 10
  const getReorderLevel = (item) => item?.reorderLevel ?? 5
  const getExpiryDate = (item) => {
    const d = item?.expiryDate || item?.expiresAt || '-'
    return d.includes('T') ? d.split('T')[0] : d
  }
  const getSellingPrice = (item) => `₹${item?.sellingPrice || item?.price || 0}`

  // Badge Status Class
  const getStatusBadge = (item) => {
    const status = String(item?.status || 'In Stock').toLowerCase()
    if (status.includes('out') || status.includes('expired')) {
      return (
        <span className="branch-status expired" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
          {item?.status || 'Out of Stock'}
        </span>
      )
    }
    if (status.includes('low') || status.includes('near')) {
      return (
        <span className="branch-status near-expiry" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {item?.status || 'Low Stock'}
        </span>
      )
    }
    return (
      <span className="branch-status active" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        In Stock
      </span>
    )
  }

  // Tab mapping configs
  const tabs = [
    { 
      key: 'inventory', 
      label: 'Inventory',
      icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
    },
    { 
      key: 'low', 
      label: 'Low Stock',
      icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    },
    { 
      key: 'near', 
      label: 'Near Expiry',
      icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    },
    { 
      key: 'out', 
      label: 'Out of Stock',
      icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><line x1="12" y1="22" x2="12" y2="12"/><line x1="10" y1="8" x2="14" y2="12"/><line x1="14" y1="8" x2="10" y2="12"/></svg>
    },
    { 
      key: 'summary', 
      label: 'Stock Summary',
      icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    },
    { 
      key: 'transactions', 
      label: 'Transactions',
      icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/></svg>
    },
    { 
      key: 'valuation', 
      label: 'Valuation',
      icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12M6 8h12M6 13h8.5a4.5 4.5 0 0 1 0 9H6M14.5 13l-9 9"/></svg>
    }
  ]

  return (
    <AdminLayout activeLabel="Stock" title="Inventory Management" subtitle="Monitor medicine stock, batches, expiry, stock levels, and inventory transactions.">
      <div className="stock-scroll-area">
        <div className="stock-layout-container">

          {/* Workflow Toolbar */}
          <div className="stock-toolbar" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '8px' }}>
            <div className="stock-action-btns">
              <button 
                type="button" 
                className="stock-btn stock-btn-primary"
                onClick={() => setAddStockOpen(true)}
              >
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                + Add Stock
              </button>
              <button 
                type="button" 
                className="stock-btn stock-btn-secondary"
                onClick={() => setAdjustOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import
              </button>
            </div>
            <button 
              type="button" 
              className="stock-btn stock-btn-secondary"
              onClick={() => load(view)}
            >
              <svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Refresh
            </button>
          </div>

          {/* Top Summary Cards (Equal Sized Grid) */}
          <div className="stock-summary-grid-redesign">
            {SUMMARY_CARDS.map((card) => {
              const value = metrics[card.metricKey] || 0
              return (
                <div 
                  key={card.id}
                  className="summary-card-redesign"
                  style={{ 
                    '--card-accent': card.color,
                    '--card-bg': card.bgColor,
                    '--card-border': card.borderColor
                  }}
                  onClick={() => handleNavigate(card.route, card.view)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleNavigate(card.route, card.view)}
                  aria-label={`Navigate to ${card.label}`}
                >
                  <div className="summary-card-icon-wrap">
                    {card.icon}
                  </div>
                  <div className="summary-card-info">
                    <label>{card.label}</label>
                    <span className="summary-card-val">{value}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Navigation Module Cards / Tabs */}
          <div className="inventory-nav-tabs-redesign">
            {NAV_TABS.map((tab) => {
              const isActive = view === tab.key
              return (
                <button 
                  key={tab.key}
                  type="button"
                  className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                  style={{ 
                    '--tab-color': tab.color,
                    '--tab-bg': tab.bgColor
                  }}
                  onClick={() => handleNavigate(tab.route, tab.key)}
                >
                  <span className="nav-tab-icon">{tab.icon}</span>
                  <span className="nav-tab-label">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Search bar & Filter selections */}
          {view !== 'summary' && view !== 'valuation' && (
            <div className="stock-toolbar">
              <div className="stock-search-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
                <input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="Search medicine, batch number..." 
                />
              </div>
              <div className="stock-filters">
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="in stock">In Stock</option>
                  <option value="low stock">Low Stock</option>
                  <option value="out of stock">Out of Stock</option>
                </select>
                <select 
                  value={expiryFilter} 
                  onChange={(e) => setExpiryFilter(e.target.value)}
                >
                  <option value="all">All Expiry Status</option>
                  <option value="expired">Expired</option>
                  <option value="near">Near Expiry</option>
                  <option value="safe">Safe</option>
                </select>
                <button 
                  type="button" 
                  className="stock-btn stock-btn-secondary"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                    setExpiryFilter('all')
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Table Results View */}
          <section className="dispense-table-panel">
            <h2>Inventory Records</h2>
            
            {loading ? (
              <div className="dispense-skeleton-row">
                <div className="dispense-skeleton-line" style={{ width: '80%' }}></div>
                <div className="dispense-skeleton-line" style={{ width: '90%' }}></div>
                <div className="dispense-skeleton-line" style={{ width: '70%' }}></div>
              </div>
            ) : view === 'summary' ? (
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>Stock Summary Metrics</h3>
                <pre style={{ fontSize: '13px', color: '#334155', margin: 0 }}>{JSON.stringify(summaryData || {}, null, 2)}</pre>
              </div>
            ) : view === 'valuation' ? (
              <div>
                <div className="valuation-summary-row">
                  <div className="valuation-metric">
                    <label>Total Inventory Value</label>
                    <span>₹{summaryData?.totalInventoryValue || summaryData?.totalCost || 0}</span>
                  </div>
                  <div className="valuation-metric">
                    <label>Total Cost Value</label>
                    <span>₹{summaryData?.totalCostValue || summaryData?.totalCost || 0}</span>
                  </div>
                  <div className="valuation-metric">
                    <label>Potential Selling Value</label>
                    <span>₹{summaryData?.potentialSellingValue || summaryData?.potentialSales || 0}</span>
                  </div>
                  <div className="valuation-metric">
                    <label>Estimated Profit</label>
                    <span style={{ color: '#10b981' }}>₹{summaryData?.estimatedProfit || summaryData?.profit || 0}</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <pre style={{ fontSize: '13px', color: '#334155', margin: 0 }}>{JSON.stringify(summaryData || {}, null, 2)}</pre>
                </div>
              </div>
            ) : view === 'transactions' ? (
              <div className="branch-table-wrap">
                <table className="branch-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Date</th>
                      <th>Medicine</th>
                      <th>Batch</th>
                      <th>Transaction Type</th>
                      <th>Quantity</th>
                      <th>Previous Stock</th>
                      <th>New Stock</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length ? filteredItems.map((item, index) => (
                      <tr key={getId(item, index)}>
                        <td><code>{item?.transactionId || item?._id || '-'}</code></td>
                        <td>{getExpiryDate(item)}</td>
                        <td>{getMedicineName(item)}</td>
                        <td><code>{getBatchNo(item)}</code></td>
                        <td>
                          <span className={`branch-status ${String(item?.type || 'Purchase').toLowerCase() === 'purchase' ? 'active' : 'view'}`}>
                            {item?.type || 'Adjustment'}
                          </span>
                        </td>
                        <td>{item?.quantity || 0}</td>
                        <td>{item?.previousStock || 0}</td>
                        <td>{item?.newStock || 0}</td>
                        <td>{item?.reason || '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="9">
                          <div className="dispense-empty-state">
                            <h3>No transactions found.</h3>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="branch-table-wrap">
                <table className="branch-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>S.No.</th>
                      <th>Medicine</th>
                      <th>Batch No.</th>
                      <th>Available Qty</th>
                      <th>Minimum Stock</th>
                      <th>Reorder Level</th>
                      <th>Expiry Date</th>
                      <th>Selling Price</th>
                      <th>Stock Status</th>
                      <th style={{ width: '180px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length ? filteredItems.map((item, index) => (
                      <tr key={getId(item, index)}>
                        <td>{index + 1}</td>
                        <td><div style={{ fontWeight: 600, color: '#1e293b' }}>{getMedicineName(item)}</div></td>
                        <td><code>{getBatchNo(item)}</code></td>
                        <td>{getQty(item)}</td>
                        <td>{getMinStock(item)}</td>
                        <td>{getReorderLevel(item)}</td>
                        <td>{getExpiryDate(item)}</td>
                        <td>{getSellingPrice(item)}</td>
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
                              aria-label="Edit Stock Levels" 
                              title="Edit Stock Levels"
                              onClick={() => prefillLevels(item)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button assign" 
                              aria-label="Prefill Adjustment" 
                              title="Prefill Adjustment"
                              onClick={() => prefillAdjustment(item)}
                            >
                              <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button danger" 
                              aria-label="Dispose Batch" 
                              title="Dispose Batch"
                              onClick={() => handleDispose(item?.batchNo || item?.batchNumber)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                            </button>
                            <button 
                              type="button" 
                              className="admin-action-button view" 
                              style={{ color: '#ca8a04', borderColor: '#fef08a', background: '#fef9c3' }}
                              aria-label="Quarantine Batch" 
                              title="Quarantine Batch"
                              onClick={() => handleQuarantine(item?.batchNo || item?.batchNumber)}
                            >
                              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="10">
                          <div className="dispense-empty-state">
                            <h3>No inventory found.</h3>
                            <p>Add medicine stock to start managing your pharmacy inventory.</p>
                            <button 
                              type="button" 
                              className="stock-btn stock-btn-primary" 
                              style={{ marginTop: '12px' }}
                              onClick={() => setAddStockOpen(true)}
                            >
                              + Add Stock
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Modal 1: Add Stock */}
          {addStockOpen && (
            <div className="stock-modal-overlay">
              <form onSubmit={handleAddStockSubmit} className="stock-modal-container">
                <div className="stock-modal-header">
                  <h2>+ Add Medicine Stock</h2>
                  <button type="button" className="stock-modal-close" onClick={() => setAddStockOpen(false)}>&times;</button>
                </div>
                <div className="stock-modal-body">
                  <div className="stock-detail-row">
                    <div className="stock-form-group">
                      <label>Medicine ID *</label>
                      <input 
                        type="text" 
                        value={stockForm.medicineId} 
                        onChange={(e) => setStockForm({...stockForm, medicineId: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="stock-form-group">
                      <label>Batch Number *</label>
                      <input 
                        type="text" 
                        value={stockForm.batchNo} 
                        onChange={(e) => setStockForm({...stockForm, batchNo: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="stock-detail-row">
                    <div className="stock-form-group">
                      <label>Stock Quantity *</label>
                      <input 
                        type="number" 
                        value={stockForm.quantity} 
                        onChange={(e) => setStockForm({...stockForm, quantity: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="stock-form-group">
                      <label>Expiry Date *</label>
                      <input 
                        type="date" 
                        value={stockForm.expiryDate} 
                        onChange={(e) => setStockForm({...stockForm, expiryDate: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="stock-detail-row">
                    <div className="stock-form-group">
                      <label>Cost Price (₹)</label>
                      <input 
                        type="number" 
                        value={stockForm.costPrice} 
                        onChange={(e) => setStockForm({...stockForm, costPrice: e.target.value})} 
                      />
                    </div>
                    <div className="stock-form-group">
                      <label>Selling Price (₹)</label>
                      <input 
                        type="number" 
                        value={stockForm.sellingPrice} 
                        onChange={(e) => setStockForm({...stockForm, sellingPrice: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="stock-detail-row">
                    <div className="stock-form-group">
                      <label>Supplier</label>
                      <input 
                        type="text" 
                        value={stockForm.supplier} 
                        onChange={(e) => setStockForm({...stockForm, supplier: e.target.value})} 
                      />
                    </div>
                    <div className="stock-form-group">
                      <label>Purchase Date</label>
                      <input 
                        type="date" 
                        value={stockForm.purchaseDate} 
                        onChange={(e) => setStockForm({...stockForm, purchaseDate: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="stock-form-group">
                    <label>Notes</label>
                    <textarea 
                      value={stockForm.notes} 
                      onChange={(e) => setStockForm({...stockForm, notes: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="stock-modal-footer">
                  <button type="button" className="stock-btn stock-btn-secondary" onClick={() => setAddStockOpen(false)}>Cancel</button>
                  <button type="submit" className="stock-btn stock-btn-primary">Add Stock</button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 2: Adjust Stock */}
          {adjustOpen && (
            <div className="stock-modal-overlay">
              <form onSubmit={handleAdjustSubmit} className="stock-modal-container">
                <div className="stock-modal-header">
                  <h2>Adjust Inventory Stock Levels</h2>
                  <button type="button" className="stock-modal-close" onClick={() => setAdjustOpen(false)}>&times;</button>
                </div>
                <div className="stock-modal-body">
                  <div className="stock-detail-row">
                    <div className="stock-form-group">
                      <label>Medicine ID *</label>
                      <input 
                        type="text" 
                        value={adjustmentForm.medicineId} 
                        onChange={(e) => setAdjustmentForm({...adjustmentForm, medicineId: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="stock-form-group">
                      <label>Batch Number</label>
                      <input 
                        type="text" 
                        value={adjustmentForm.batchId} 
                        onChange={(e) => setAdjustmentForm({...adjustmentForm, batchId: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="stock-detail-row">
                    <div className="stock-form-group">
                      <label>Adjustment Type</label>
                      <select 
                        value={adjustmentForm.type} 
                        onChange={(e) => setAdjustmentForm({...adjustmentForm, type: e.target.value})}
                      >
                        <option value="increase">Increase (+)</option>
                        <option value="decrease">Decrease (-)</option>
                      </select>
                    </div>
                    <div className="stock-form-group">
                      <label>Quantity *</label>
                      <input 
                        type="number" 
                        value={adjustmentForm.quantity} 
                        onChange={(e) => setAdjustmentForm({...adjustmentForm, quantity: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="stock-form-group">
                    <label>Reason *</label>
                    <input 
                      type="text" 
                      value={adjustmentForm.reason} 
                      onChange={(e) => setAdjustmentForm({...adjustmentForm, reason: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="stock-form-group">
                    <label>Notes</label>
                    <textarea 
                      value={adjustmentForm.notes} 
                      onChange={(e) => setAdjustmentForm({...adjustmentForm, notes: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="stock-modal-footer">
                  <button type="button" className="stock-btn stock-btn-secondary" onClick={() => setAdjustOpen(false)}>Cancel</button>
                  <button type="submit" className="stock-btn stock-btn-primary">Adjust Stock</button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 3: Config Levels */}
          {levelsOpen && (
            <div className="stock-modal-overlay">
              <form onSubmit={handleLevelsSubmit} className="stock-modal-container">
                <div className="stock-modal-header">
                  <h2>Configure Stock Levels</h2>
                  <button type="button" className="stock-modal-close" onClick={() => setLevelsOpen(false)}>&times;</button>
                </div>
                <div className="stock-modal-body">
                  <div className="stock-form-group">
                    <label>Medicine ID *</label>
                    <input 
                      type="text" 
                      value={levelsForm.medicineId} 
                      onChange={(e) => setLevelsForm({...levelsForm, medicineId: e.target.value})} 
                      required 
                      disabled 
                    />
                  </div>
                  <div className="stock-detail-row">
                    <div className="stock-form-group">
                      <label>Minimum Stock Level *</label>
                      <input 
                        type="number" 
                        value={levelsForm.minimumStock} 
                        onChange={(e) => setLevelsForm({...levelsForm, minimumStock: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="stock-form-group">
                      <label>Maximum Stock Level *</label>
                      <input 
                        type="number" 
                        value={levelsForm.maximumStock} 
                        onChange={(e) => setLevelsForm({...levelsForm, maximumStock: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="stock-form-group">
                    <label>Reorder Threshold Level *</label>
                    <input 
                      type="number" 
                      value={levelsForm.reorderLevel} 
                      onChange={(e) => setLevelsForm({...levelsForm, reorderLevel: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="stock-modal-footer">
                  <button type="button" className="stock-btn stock-btn-secondary" onClick={() => setLevelsOpen(false)}>Cancel</button>
                  <button type="submit" className="stock-btn stock-btn-primary">Save Levels</button>
                </div>
              </form>
            </div>
          )}

          {/* Modal 4: View Medicine Details */}
          {viewingItem && (
            <div className="stock-modal-overlay">
              <div className="stock-modal-container">
                <div className="stock-modal-header">
                  <h2>Medicine Inventory Details: {getMedicineName(viewingItem)}</h2>
                  <button type="button" className="stock-modal-close" onClick={() => setViewingItem(null)}>&times;</button>
                </div>
                <div className="stock-modal-body">
                  <div className="stock-detail-row">
                    <div className="stock-detail-item">
                      <label>Medicine Name</label>
                      <span>{getMedicineName(viewingItem)}</span>
                    </div>
                    <div className="stock-detail-item">
                      <label>Batch Number</label>
                      <span><code>{getBatchNo(viewingItem)}</code></span>
                    </div>
                  </div>
                  <div className="stock-detail-row">
                    <div className="stock-detail-item">
                      <label>Available Quantity</label>
                      <span>{getQty(viewingItem)} units</span>
                    </div>
                    <div className="stock-detail-item">
                      <label>Expiry Date</label>
                      <span>{getExpiryDate(viewingItem)}</span>
                    </div>
                  </div>
                  <div className="stock-detail-row">
                    <div className="stock-detail-item">
                      <label>Minimum Stock Level</label>
                      <span>{getMinStock(viewingItem)}</span>
                    </div>
                    <div className="stock-detail-item">
                      <label>Reorder Threshold</label>
                      <span>{getReorderLevel(viewingItem)}</span>
                    </div>
                  </div>
                  <div className="stock-detail-row">
                    <div className="stock-detail-item">
                      <label>Selling Price</label>
                      <span>{getSellingPrice(viewingItem)}</span>
                    </div>
                    <div className="stock-detail-item">
                      <label>Status Badge</label>
                      <div style={{ marginTop: '4px' }}>{getStatusBadge(viewingItem)}</div>
                    </div>
                  </div>
                </div>
                <div className="stock-modal-footer">
                  <button type="button" className="stock-btn stock-btn-primary" onClick={() => setViewingItem(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  )
}
