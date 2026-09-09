import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPharmacyAdminDashboard } from '../../config/api'
import AdminLayout from './AdminLayout'
import AdminTable from './AdminTable'

const dashboardTables = {
  medicines: {
    title: 'Medicines',
    action: '+ Add Medicine',
    headers: ['Name', 'Category', 'Strength', 'Unit', 'Action'],
    rows: [],
  },
  stock: {
    title: 'Stock Management',
    action: '+ Stock In',
    headers: ['Medicine', 'Batch No.', 'Qty', 'Expiry Date', 'Status'],
    rows: [],
  },
  reports: {
    title: 'Reports',
    action: 'Generate',
    headers: ['Report', 'Type', 'Created By', 'Status'],
    rows: [],
  },
}

const unwrap = (response) => response?.data?.dashboard || response?.data || response?.dashboard || response || {}
const pick = (source, keys, fallback = 0) => keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback
const list = (source, keys) => keys.map((key) => source?.[key]).find(Array.isArray) || []
const text = (source, keys, fallback = '-') => pick(source, keys, fallback)

function AdminDashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salesFilter, setSalesFilter] = useState('7d')

  useEffect(() => {
    let active = true
    getPharmacyAdminDashboard()
      .then((response) => active && setDashboard(unwrap(response)))
      .catch(() => active && setDashboard({}))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const view = useMemo(() => {
    const source = dashboard?.summary || dashboard?.stats || dashboard || {}
    const todaySales = pick(source, ['todaySales', 'salesToday', 'dailySales'], 0)
    const prescriptions = pick(source, ['prescriptions', 'totalPrescriptions', 'prescriptionsCount'], 0)
    const lowStock = pick(source, ['lowStock', 'lowStockCount', 'lowStockMedicines'], 0)
    const expiryAlerts = pick(source, ['expiryAlerts', 'expiryAlertsCount', 'nearExpiryCount'], 0)

    return {
      source,
      stats: [
        {
          id: 'sales',
          label: 'Today Sales',
          val: `₹${todaySales}`,
          subText: 'Live dashboard data',
          badgeText: '+0% today',
          route: '/transactions',
          color: '#0878e8',
          bgColor: '#eaf4ff',
          borderColor: 'rgba(8, 120, 232, 0.2)',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          )
        },
        {
          id: 'prescriptions',
          label: 'Prescriptions',
          val: prescriptions,
          subText: 'Today\'s prescriptions',
          badgeText: 'Active',
          route: '/admin/prescriptions',
          color: '#8b5cf6',
          bgColor: '#f3eeff',
          borderColor: 'rgba(139, 92, 246, 0.2)',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          )
        },
        {
          id: 'lowStock',
          label: 'Low Stock',
          val: lowStock,
          subText: 'Needs attention',
          badgeText: 'Alert',
          route: '/low-stock',
          color: '#f59e0b',
          bgColor: '#fff7e6',
          borderColor: 'rgba(245, 158, 11, 0.2)',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )
        },
        {
          id: 'expiryAlerts',
          label: 'Expiry Alerts',
          val: expiryAlerts,
          subText: 'Requires review',
          badgeText: 'Near Expiry',
          route: '/near-expiry',
          color: '#ef4444',
          bgColor: '#fff0f0',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )
        }
      ],
      topMedicines: list(dashboard, ['topMedicines', 'topSelling', 'medicines']),
      recentStock: list(dashboard, ['stock', 'inventory', 'lowStockItems']),
      reports: list(dashboard, ['reports', 'recentReports', 'activities']),
    }
  }, [dashboard])

  return (
    <AdminLayout activeLabel="Dashboard" title="Admin Dashboard" subtitle="Admin / Dashboard">
      {/* Dashboard Page Header */}
      <section className="branch-dashboard-header-redesign">
        <div>
          <div className="header-title-badge-row">
            <h1>Admin Dashboard</h1>
            <span className="live-status-pill">
              <i className="pulse-dot-green" />
              Live Operations
            </span>
          </div>
          <p>Branch-wise operations management for sales, prescriptions, stock, and alerts.</p>
        </div>
      </section>

      {/* Top 4 Equal-Sized Statistic Cards */}
      <section className="branch-summary-4grid">
        {view.stats.map((card) => (
          <div
            key={card.id}
            className="stat-card-redesign"
            style={{
              '--card-accent': card.color,
              '--card-bg': card.bgColor,
              '--card-border': card.borderColor
            }}
            onClick={() => navigate(card.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(card.route)}
            aria-label={`Navigate to ${card.label}`}
          >
            <div className="stat-card-top">
              <div className="stat-card-icon-wrap">
                {card.icon}
              </div>
              <span className="stat-card-badge">{card.badgeText}</span>
            </div>
            <div className="stat-card-body">
              <label>{card.label}</label>
              <strong className="stat-card-val">{loading ? '...' : card.val}</strong>
              <small className="stat-card-sub">{card.subText}</small>
            </div>
          </div>
        ))}
      </section>

      {/* Analytics & Ranking Section */}
      <section className="branch-grid">
        <section className="branch-panel branch-chart-panel">
          <div className="branch-panel-heading">
            <h2>Sales Overview</h2>
            <div className="chart-filter-pills">
              <button
                type="button"
                className={salesFilter === 'today' ? 'active' : ''}
                onClick={() => setSalesFilter('today')}
              >
                Today
              </button>
              <button
                type="button"
                className={salesFilter === '7d' ? 'active' : ''}
                onClick={() => setSalesFilter('7d')}
              >
                7 Days
              </button>
              <button
                type="button"
                className={salesFilter === '30d' ? 'active' : ''}
                onClick={() => setSalesFilter('30d')}
              >
                30 Days
              </button>
            </div>
          </div>
          <div className="analytics-card-body">
            <div className="analytics-empty-state">
              <div className="analytics-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3>No sales activity recorded yet</h3>
              <p>Sales transactions and revenue trends will appear here in real time.</p>
              <button
                type="button"
                className="btn-create-sale"
                onClick={() => navigate('/admin/dispensing')}
              >
                + Create Dispense / Sale
              </button>
            </div>
          </div>
        </section>

        <section className="branch-panel">
          <div className="branch-panel-heading">
            <h2>Top Medicines</h2>
          </div>
          <div className="top-meds-card-body">
            {view.topMedicines.length ? (
              <div className="top-meds-list">
                {view.topMedicines.slice(0, 5).map((med, idx) => (
                  <div className="top-med-item" key={getId(med, idx)}>
                    <span className="med-rank">0{idx + 1}</span>
                    <div className="med-details">
                      <strong>{text(med, ['name', 'medicineName'])}</strong>
                      <small>{text(med, ['category', 'categoryName'])}</small>
                    </div>
                    <div className="med-qty-badge">
                      <span>{text(med, ['quantitySold', 'sold', 'quantity'], 0)} sold</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="analytics-empty-state">
                <div className="analytics-empty-icon" style={{ background: '#ecfcff', color: '#06b6d4' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m10.5 11.5 5 5m-2.5-9L8 12.5a4.24 4.24 0 0 0 6 6l5-5a4.24 4.24 0 0 0-6-6Z" />
                  </svg>
                </div>
                <h3>No medicine rankings</h3>
                <p>Top fast-moving products will be ranked here.</p>
              </div>
            )}
          </div>
        </section>
      </section>

      {/* Lower Dashboard Tables Grid */}
      <section className="branch-grid three">
        <AdminTable
          {...dashboardTables.medicines}
          rows={view.topMedicines.map((item) => [
            text(item, ['name', 'medicineName']),
            text(item, ['category', 'categoryName']),
            text(item, ['strength']),
            text(item, ['unit', 'dosageForm']),
            text(item, ['status'], 'Active'),
          ])}
          onActionClick={() => navigate('/admin/medicines')}
        />
        <AdminTable
          {...dashboardTables.stock}
          rows={view.recentStock.map((item) => [
            text(item, ['medicineName', 'name']),
            text(item, ['batchNo', 'batchNumber']),
            text(item, ['quantity', 'qty', 'currentStock'], 0),
            text(item, ['expiryDate', 'expiry']),
            text(item, ['status'], 'Active'),
          ])}
          onActionClick={() => navigate('/inventory')}
        />
        <AdminTable
          {...dashboardTables.reports}
          rows={view.reports.map((item) => [
            text(item, ['title', 'name', 'report']),
            text(item, ['type', 'category']),
            text(item, ['createdBy', 'userName']),
            text(item, ['status'], 'Ready'),
          ])}
          onActionClick={() => navigate('/admin/reports')}
        />
      </section>
    </AdminLayout>
  )
}

function getId(item, index) {
  return item?._id || item?.id || item?.uuid || `${index}`
}

export default AdminDashboard
