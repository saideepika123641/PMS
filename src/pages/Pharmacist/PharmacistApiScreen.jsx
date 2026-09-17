import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../components/ToastProvider'
import PharmacistLayout from './PharmacistLayout'

const listKeys = [
  'items',
  'results',
  'records',
  'data',
  'prescriptions',
  'pendingPrescriptions',
  'dispensing',
  'bills',
  'returns',
  'payments',
  'auditLogs',
  'logs',
  'alerts',
  'inventory',
  'medicines',
  'sales',
  'purchases',
  'stockMovement',
  'stockSummary',
  'topSelling',
]

const moduleColumns = {
  Dashboard: [
    ['Metric', ['label', 'title', 'name', 'metric', 'type']],
    ['Value', ['value', 'count', 'total', 'amount', 'quantity']],
    ['Status', ['status', 'state']],
  ],
  Pending: [
    ['Prescription ID', ['prescriptionId', 'externalPrescriptionId', 'recordId', 'id', '_id']],
    ['Patient', ['patientName', 'patient.name', 'patient.fullName', 'patient']],
    ['Doctor', ['doctorName', 'doctor.name', 'doctor.fullName', 'doctor']],
    ['Medicine', ['medicineName', 'medicine.name', 'medicine']],
    ['Status', ['status', 'prescriptionStatus']],
    ['Date', ['createdAt', 'date', 'prescriptionDate']],
  ],
  Dispensing: [
    ['Prescription ID', ['prescriptionId', 'recordId', 'id', '_id']],
    ['Patient', ['patientName', 'patient.name', 'patient']],
    ['Medicine', ['medicineName', 'medicine.name', 'medicine']],
    ['Quantity', ['quantity', 'qty', 'dispensedQuantity']],
    ['Bill ID', ['billId', 'bill.id', 'invoiceId']],
    ['Status', ['status', 'paymentStatus', 'dispenseStatus']],
  ],
  Bills: [
    ['Bill ID', ['billId', 'invoiceId', 'id', '_id']],
    ['Patient', ['patientName', 'patient.name', 'patient']],
    ['Amount', ['totalAmount', 'amount', 'grandTotal', 'total']],
    ['Payment', ['paymentStatus', 'payment.status']],
    ['Status', ['status']],
    ['Date', ['createdAt', 'date', 'billDate']],
  ],
  Returns: [
    ['Return ID', ['returnId', 'id', '_id']],
    ['Bill ID', ['billId', 'bill.id', 'invoiceId']],
    ['Medicine', ['medicineName', 'medicine.name', 'medicine']],
    ['Quantity', ['quantity', 'qty', 'returnQuantity']],
    ['Reason', ['reason', 'returnReason']],
    ['Status', ['status']],
  ],
  Reports: [
    ['Report', ['title', 'name', 'report', 'type']],
    ['Category', ['category', 'reportType', 'module']],
    ['Amount', ['amount', 'total', 'revenue', 'sales']],
    ['Count', ['count', 'quantity', 'totalCount']],
    ['Status', ['status']],
    ['Date', ['createdAt', 'date', 'period']],
  ],
}

const dashboardCards = [
  ['pending', 'Total Pending', ['pendingPrescriptions', 'pendingPrescriptionsCount', 'pendingCount', 'summary.pendingPrescriptions', 'summary.pendingCount'], '#8b5cf6', '#f3eeff', 'prescriptions'],
  ['dispensed', 'Dispensed Today', ['todayDispensed', 'dispensedCount', 'dispensed', 'summary.todayDispensed', 'summary.dispensedCount'], '#0878e8', '#eaf4ff', 'sales'],
  ['bills', 'Total Bills', ['totalBills', 'billsCount', 'paidBillsCount', 'summary.totalBills', 'summary.billsCount'], '#d97706', '#fef3c7', 'lowStock'],
  ['returns', 'Returns', ['todayReturns', 'returnsCount', 'returns', 'summary.todayReturns', 'summary.returnsCount'], '#ef4444', '#fee2e2', 'expiryAlerts'],
]

const panelMeta = {
  Dashboard: {
    title: 'Live Overview & Activity',
    desc: 'Review live dashboard metrics and status from pharmacist APIs.',
  },
  Pending: {
    title: 'Prescription Queue',
    desc: 'Review and process pending prescriptions awaiting fulfillment.',
  },
  Dispensing: {
    title: 'Dispensing & Invoicing',
    desc: 'Fulfill prescriptions, generate bills, and record payments.',
  },
  Bills: {
    title: 'Billing Management',
    desc: 'Review invoices, process bill cancellations, and manage refunds.',
  },
  Returns: {
    title: 'Returns Management',
    desc: 'Process medicine returns, inspect batch items, and track statuses.',
  },
  Reports: {
    title: 'Analytics & Audit Logs',
    desc: 'Review sales reports, expiry tracking, audit logs, and stock movements.',
  },
}


function getByPath(source, path) {
  return String(path).split('.').reduce((value, key) => value?.[key], source)
}

function pick(source, paths, fallback = '-') {
  for (const path of paths) {
    const value = getByPath(source, path)
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

function displayValue(value) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return pick(value, ['name', 'title', 'label', 'id', '_id'], JSON.stringify(value))
  return String(value ?? '-')
}

function unwrapPayload(response) {
  return response?.data?.dashboard || response?.data || response?.dashboard || response || {}
}

function findList(source) {
  if (Array.isArray(source)) return source
  if (!source || typeof source !== 'object') return []

  for (const key of listKeys) {
    const value = source[key]
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      const nested = findList(value)
      if (nested.length) return nested
    }
  }

  return []
}

function metricsAsRows(source) {
  if (!source || Array.isArray(source) || typeof source !== 'object') return []
  const summary = source.summary || source.stats || source.counts || source

  return Object.entries(summary)
    .filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => ({ label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()), value }))
}

function normalizeItems(response, activeLabel) {
  const payload = unwrapPayload(response)
  const rows = findList(payload)
  if (rows.length) return rows
  if (activeLabel === 'Dashboard') return metricsAsRows(payload)
  if (payload && typeof payload === 'object' && Object.keys(payload).length) return [payload]
  return []
}

function metricValue(source, paths) {
  const value = pick(source, paths, 0)
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Number(value.total ?? value.count ?? value.value ?? Object.keys(value).length) || 0
  return Number(value) || 0
}

function ActionIcon() {
  return <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
}

function getDashboardCardIcon(key) {
  if (key === 'pending') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
  }
  if (key === 'dispensed') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  }
  if (key === 'bills') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M6 8h12M6 12h12M6 16h10"/></svg>
  }
  if (key === 'returns') {
    return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  }
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
}

function getTabBtnIcon(label) {
  const name = String(label).toLowerCase()
  if (name.includes('dashboard')) {
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  }
  if (name.includes('alert')) {
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  }
  if (name.includes('batch')) {
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12 22"/><polyline points="2 12 12 17 22 12"/></svg>
  }
  if (name.includes('inventory')) {
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
  }
  return <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
}

function PharmacistApiScreen({ activeLabel, title, subtitle, load, actions = [] }) {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [id, setId] = useState('')
  const [bodyText, setBodyText] = useState('{}')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rawResponse, setRawResponse] = useState(null)
  const [activeTabLabel, setActiveTabLabel] = useState(actions[0]?.label || '')

  const refresh = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await load()
      setRawResponse(response)
      setItems(normalizeItems(response, activeLabel))
    } catch (error) {
      setItems([])
      setRawResponse(null)
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [activeLabel, load, showToast])

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  async function run(action) {
    setActiveTabLabel(action.label)
    setActionLoading(true)
    setMessage('')
    try {
      const parsedBody = bodyText.trim() ? JSON.parse(bodyText) : {}
      const body = typeof action.payload === 'function' ? action.payload(id, parsedBody) : action.payload || parsedBody
      const response = await action.fn(id, body)
      setRawResponse(response)
      setItems(normalizeItems(response, activeLabel))
      showToast(response?.message || `${action.label} completed.`)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = moduleColumns[activeLabel] || moduleColumns.Dashboard
  const payload = unwrapPayload(rawResponse)
  const stats = useMemo(() => dashboardCards.map(([key, label, paths, color, bgColor, colorClass]) => ({ key, label, value: metricValue(payload, paths), color, bgColor, colorClass })), [payload])
  const emptyStateTitle = loading ? 'Loading data...' : activeLabel === 'Pending' ? 'No pending prescriptions found' : 'No data found'
  const emptyStateDesc = loading ? 'Please wait while latest API data loads.' : 'No records were returned by the API for this module.'
  const isDashboard = activeLabel === 'Dashboard'
  const selectedAction = actions.find((action) => action.label === activeTabLabel)
  const showRequestBody = !isDashboard && selectedAction && /create|dispense|generate|record|cancel|refund|approve|pay/i.test(selectedAction.label)

  return (
    <PharmacistLayout activeLabel={activeLabel} title={title} subtitle={subtitle}>
      <div className="pharmacist-dashboard-container">
        {isDashboard ? (
          <section className="branch-dashboard-header-redesign reference-heading-card">
            <div className="reference-heading-accent" />
            <div className="admin-heading-text-wrap">
              <div className="header-title-badge-row">
                <h1>Pharmacist Dashboard</h1>
                <span className="live-status-pill">
                  <i className="pulse-dot-green" />
                  Live Operations
                </span>
              </div>
              <p>Pharmacist operations management for prescriptions, dispensing, bills, and reports.</p>
            </div>
          </section>
        ) : null}

        {isDashboard ? (
          <section className="branch-summary-4grid">
            {stats.map((stat) => (
              <div
                key={stat.key}
                className={`stat-card-redesign stat-card-${stat.colorClass}`}
                role="button"
                tabIndex={0}
              >
                <div className="stat-card-icon-wrap" style={{ background: stat.bgColor, color: stat.color }}>
                  {getDashboardCardIcon(stat.key)}
                </div>
                <div className="stat-card-body">
                  <strong className="stat-card-val">{loading ? '...' : stat.value}</strong>
                  <label>{stat.label}</label>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <section className="branch-panel pharmacist-panel">
          <div className="branch-panel-heading">
            <div>
              <h2>{panelMeta[activeLabel]?.title || title}</h2>
              <p>{panelMeta[activeLabel]?.desc || 'Use module actions to fetch or update records.'}</p>
            </div>
            <div className="branch-panel-heading-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={refresh}
                disabled={loading}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: loading ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.5s ease',
                  }}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>

          <div className="pharmacist-toolbar-row">
            <div className="pharmacist-search-group">
              <div className="pharmacist-search">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                  <circle cx="11" cy="11" r="6" />
                  <path d="m16 16 4 4" />
                </svg>
                <input
                  value={id}
                  onChange={(event) => setId(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && refresh()}
                  placeholder={`Search ${activeLabel.toLowerCase()} records by ID / Number...`}
                />
                {id ? (
                  <button type="button" className="search-clear-btn" onClick={() => { setId(''); refresh(); }} title="Clear">
                    ✕
                  </button>
                ) : null}
                <button type="button" onClick={refresh} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            <div className="pharmacist-toolbar-actions-wrap">
              {actions.length > 0 ? (
                <div className="module-action-tabs">
                  {actions.map((action) => {
                    const isActive = activeTabLabel === action.label
                    return (
                      <button
                        type="button"
                        className={`module-action-tab${isActive ? ' active' : ''}`}
                        onClick={() => run(action)}
                        key={action.label}
                        disabled={actionLoading}
                      >
                        {getTabBtnIcon(action.label)}
                        <span>{actionLoading && isActive ? 'Loading...' : action.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {items.length > 0 ? (
                <span className="table-status-badge status-success pharmacist-records-badge">
                  <span className="live-status-dot" />
                  {items.length} Records
                </span>
              ) : null}
            </div>
          </div>

          {showRequestBody ? (
            <details className="pharmacist-json-input-card" style={{ marginBottom: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
              <summary className="json-input-header" style={{ cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                <span>Request Payload (JSON)</span>
              </summary>
              <textarea
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                rows={4}
                aria-label="Request Body JSON"
                placeholder="Enter JSON payload"
                style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </details>
          ) : null}

          <div className="branch-table-wrap">
            <table className="branch-table">
              <thead>
                <tr>{columns.map(([header]) => <th key={header}>{header}</th>)}</tr>
              </thead>
              <tbody>
                {items.length ? items.map((item, index) => (
                  <tr key={pick(item, ['id', '_id', 'billId', 'prescriptionId', 'returnId'], index)}>
                    {columns.map(([header, paths]) => {
                      const val = displayValue(pick(item, paths))
                      const isStatus = header.toLowerCase() === 'status' || header.toLowerCase() === 'payment'
                      if (isStatus && val !== '-') {
                        const statusClass = ['active', 'paid', 'completed', 'dispensed', 'approved', 'ready'].includes(String(val).toLowerCase())
                          ? 'status-success'
                          : ['pending', 'processing', 'partially_paid'].includes(String(val).toLowerCase())
                          ? 'status-warning'
                          : ['cancelled', 'rejected', 'failed', 'refunded', 'inactive'].includes(String(val).toLowerCase())
                          ? 'status-danger'
                          : 'status-default'
                        return (
                          <td key={header}>
                            <span className={`table-status-badge ${statusClass}`}>{val}</span>
                          </td>
                        )
                      }
                      return <td key={header}>{val}</td>
                    })}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length}>
                      <div className="table-empty-box" style={{ padding: '36px 16px', flexDirection: 'column' }}>
                        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <circle cx="10.5" cy="13.5" r="2.5" />
                          <line x1="16.5" y1="19.5" x2="12.2" y2="15.2" />
                        </svg>
                        <strong style={{ fontSize: '14px', color: '#334155', marginBottom: '3px' }}>{emptyStateTitle}</strong>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '12.5px' }}>{emptyStateDesc}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {message ? <div className="pharmacist-json-wrapper" style={{ marginTop: '16px' }}><pre className="pharmacist-json">{message}</pre></div> : null}
        </section>
      </div>
    </PharmacistLayout>
  )
}

export default PharmacistApiScreen

