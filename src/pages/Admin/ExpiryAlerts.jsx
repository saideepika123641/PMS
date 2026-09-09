import { useEffect, useState, useMemo } from 'react'
import { useToast } from '../../components/ToastProvider'
import { getExpiredInventory, getNearExpiryInventory, getNearExpiryInventoryDetails } from '../../config/api'
import AdminLayout from './AdminLayout'

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.inventory)) return response.inventory
  if (Array.isArray(response?.results)) return response.results
  return []
}

function getId(item, index) {
  return item?._id || item?.id || item?.batchId || `${item?.medicineName || 'expiry'}-${index}`
}

export default function ExpiryAlerts() {
  const { showToast } = useToast()
  const [mode, setMode] = useState('near')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  async function load(nextMode = mode) {
    setMode(nextMode)
    setLoading(true)
    try {
      const response = nextMode === 'expired'
        ? await getExpiredInventory()
        : nextMode === 'details'
          ? await getNearExpiryInventoryDetails()
          : await getNearExpiryInventory()
      setItems(normalizeList(response))
      showToast(`Expiry list (${nextMode}) refreshed.`)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('near')
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = (item?.medicineName || item?.medicine?.name || item?.name || '').toLowerCase()
      const batch = (item?.batchNo || item?.batchNumber || item?.batchId || '').toLowerCase()
      const query = search.toLowerCase()
      
      const matchesSearch = name.includes(query) || batch.includes(query)
      
      const itemStatus = String(item?.status || mode).toLowerCase()
      const matchesStatus = statusFilter === 'all' || itemStatus.includes(statusFilter)
      
      return matchesSearch && matchesStatus
    })
  }, [items, search, statusFilter, mode])

  function getStatusLabel(item) {
    const status = String(item?.status || mode).toLowerCase()
    if (status.includes('expired')) return 'Expired'
    if (status.includes('near') || status.includes('warning')) return 'Near Expiry'
    return 'Safe'
  }

  function getStatusClass(item) {
    const status = String(item?.status || mode).toLowerCase()
    if (status.includes('expired')) return 'expired'
    if (status.includes('near') || status.includes('warning')) return 'near-expiry'
    return 'active'
  }

  return (
    <AdminLayout activeLabel="Expiry Alerts" title="Expiry Inventory" subtitle="Track medicines that are near expiry or already expired.">
      <section className="branch-panel">
        
        <div className="branch-panel-heading" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div className="expiry-tabs-card-grid">
            <button 
              type="button" 
              className={`expiry-tab-card ${mode === 'near' ? 'active' : ''}`}
              style={{ '--card-accent': '#f97316', '--card-bg': '#ffedd5', '--card-border': 'rgba(249, 115, 22, 0.25)' }}
              onClick={() => load('near')}
            >
              <div className="expiry-card-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="expiry-card-text">
                <span>Near Expiry</span>
                <small>Approaching Expiration</small>
              </div>
            </button>

            <button 
              type="button" 
              className={`expiry-tab-card ${mode === 'details' ? 'active' : ''}`}
              style={{ '--card-accent': '#0ea5e9', '--card-bg': '#e0f2fe', '--card-border': 'rgba(14, 165, 233, 0.25)' }}
              onClick={() => load('details')}
            >
              <div className="expiry-card-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="expiry-card-text">
                <span>Near Expiry Details</span>
                <small>Detailed Batch Audit</small>
              </div>
            </button>

            <button 
              type="button" 
              className={`expiry-tab-card ${mode === 'expired' ? 'active' : ''}`}
              style={{ '--card-accent': '#ef4444', '--card-bg': '#fee2e2', '--card-border': 'rgba(239, 68, 68, 0.25)' }}
              onClick={() => load('expired')}
            >
              <div className="expiry-card-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="m14 14-4 4m0-4 4 4" />
                </svg>
              </div>
              <div className="expiry-card-text">
                <span>Expired</span>
                <small>Expired Stock List</small>
              </div>
            </button>
          </div>
          <button 
            type="button" 
            onClick={() => load(mode)}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Refresh
          </button>
        </div>

        <div className="medicine-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <div className="report-search-input-wrap" style={{ flex: 1, maxWidth: '320px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon" style={{ position: 'absolute', left: '12px', width: '15px', height: '15px', stroke: '#94a3b8', fill: 'none', strokeWidth: 2 }}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search medicine, batch number..." 
              style={{ width: '100%', height: '38px', padding: '0 12px 0 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: '38px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none' }}
          >
            <option value="all">All Statuses</option>
            <option value="near">Near Expiry</option>
            <option value="expired">Expired</option>
            <option value="active">Safe</option>
          </select>
        </div>

        {loading ? (
          <p style={{ padding: '20px 0', color: '#64748b', fontSize: '14px' }}>Loading expiry alerts...</p>
        ) : (
          <div className="branch-table-wrap">
            <table className="branch-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Status</th>
                  <th style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length ? filteredItems.map((item, index) => (
                  <tr key={getId(item, index)}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {item?.medicineName || item?.medicine?.name || item?.name || '-'}
                      </div>
                    </td>
                    <td><code>{item?.batchNo || item?.batchNumber || item?.batchId || '-'}</code></td>
                    <td>{item?.quantity || item?.stock || item?.qty || 0}</td>
                    <td>{item?.expiryDate || item?.expiresAt || '-'}</td>
                    <td>
                      <span style={{ fontWeight: 500, color: (item?.daysLeft ?? 30) <= 0 ? '#ef4444' : '#f59e0b' }}>
                        {item?.daysLeft ?? '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`branch-status ${getStatusClass(item)}`}>
                        {getStatusLabel(item)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-action-group">
                        <button 
                          type="button" 
                          className="admin-action-button view" 
                          aria-label="View details" 
                          title="View details"
                          onClick={() => showToast(`Batch details: Qty ${item?.quantity || 0}, Expiry ${item?.expiryDate}`, 'info')}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <button 
                          type="button" 
                          className="admin-action-button edit" 
                          aria-label="Edit stock" 
                          title="Edit stock"
                          onClick={() => showToast(`Opening edit details for medicine ${item?.medicineName || 'stock'}`, 'info')}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
                        </button>
                        <button 
                          type="button" 
                          className="admin-action-button danger" 
                          aria-label="Dispose batch" 
                          title="Dispose batch"
                          onClick={() => showToast(`Initiating disposal flow for batch ${item?.batchNo || 'item'}`, 'info')}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ color: '#64748b', fontSize: '15px', fontWeight: 600 }}>No expiry medicines found.</div>
                      <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>All checkups complete. No stocks match the selected horizon.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  )
}
