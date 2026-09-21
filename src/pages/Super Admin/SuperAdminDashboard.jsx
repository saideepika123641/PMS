import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPharmacySuperAdminDashboard, getPharmacySuperAdminDashboardAnalytics, getPharmacySuperAdminDashboardExpiryAlerts, getPharmacySuperAdminDashboardLowStock, listPharmacyAdmins } from '../../config/api'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import './DashboardReference.css'

const unwrap = (response) => response?.data?.dashboard || response?.data || response?.dashboard || response || {}
const pick = (item, keys, fallback = '-') => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback
const items = (source, keys) => keys.map((key) => source?.[key]).find(Array.isArray) || []
const money = (amount) => typeof amount === 'number' ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount) : amount || '₹0.00'
const numeric = (value) => Number(String(value ?? 0).replace(/[^0-9.-]/g, '')) || 0
const percent = (value) => `${numeric(value) >= 0 ? '+' : ''}${numeric(value)}%`

function adminCount(response) {
  const total = response?.data?.total ?? response?.data?.count ?? response?.total ?? response?.count ?? response?.pagination?.total ?? response?.data?.pagination?.total
  if (total !== undefined && total !== null) return numeric(total)

  const admins = [response, response?.data, response?.data?.admins, response?.admins, response?.data?.results, response?.results].find(Array.isArray)
  return admins?.length || 0
}

function series(source) {
  const values = items(source, ['salesOverview', 'monthlySales', 'revenueByMonth', 'salesByMonth', 'revenue'])
  if (Array.isArray(values)) return values
  if (values && typeof values === 'object') return Object.entries(values).map(([label, value]) => ({ label, value }))
  return []
}

function rowStatus(item) {
  const current = pick(item, ['status', 'isActive'], 'Active')
  return typeof current === 'boolean' ? current ? 'Active' : 'Inactive' : String(current)
}

function stockStatus(item) {
  const status = String(pick(item, ['stockStatus', 'inventoryStatus', 'status'], '')).toLowerCase()
  if (status.includes('critical')) return 'Critical'
  if (status.includes('low')) return 'Low'
  const current = numeric(pick(item, ['stock', 'currentStock', 'quantity', 'qty'], 0))
  const minimum = numeric(pick(item, ['minStock', 'minimumStock', 'reorderLevel', 'minimumLevel'], 0))
  return current <= minimum ? 'Critical' : current <= minimum * 1.5 ? 'Low' : 'Normal'
}

function expiryStatus(item) {
  const days = numeric(pick(item, ['daysRemaining', 'daysToExpiry', 'remainingDays'], 0))
  return { days, label: days < 0 ? 'Expired' : `In ${days} days` }
}

function SmallTable({ type, rows }) {
  const isBranches = type === 'Branches'
  const columns = isBranches ? ['Branch Name', 'Clinic', 'Location', 'Status'] : ['Medicine Name', 'Category', 'Manufacturer', 'Stock', 'Min. Stock', 'Status']

  return (
    <div className="reference-table-wrap">
      <table className="reference-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.slice(0, 4).map((row, index) => (
            <tr key={pick(row, ['_id', 'id', 'branchId', 'medicineId', 'sku'], index)}>
              {isBranches ? (
                <>
                  <td>{pick(row, ['branchName', 'name', 'title'])}</td>
                  <td>{pick(row, ['clinicName', 'hospitalName', 'clinic'])}</td>
                  <td>{pick(row, ['location', 'address', 'city'])}</td>
                </>
              ) : (
                <>
                  <td>{pick(row, ['medicineName', 'name', 'medicine'])}</td>
                  <td>{pick(row, ['category', 'categoryName'])}</td>
                  <td>{pick(row, ['manufacturer', 'brand', 'company'])}</td>
                  <td>{pick(row, ['stock', 'currentStock', 'quantity', 'qty'], 0)}</td>
                  <td>{pick(row, ['minStock', 'minimumStock', 'reorderLevel', 'minimumLevel'], 0)}</td>
                </>
              )}
              <td><span className={`reference-status ${(isBranches ? rowStatus(row) : stockStatus(row)).toLowerCase()}`}>{isBranches ? rowStatus(row) : stockStatus(row)}</span></td>
            </tr>
          )) : <tr><td colSpan={columns.length}>No {type.toLowerCase()} available.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function SuperAdminDashboard() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [adminTotal, setAdminTotal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.classList.add('dashboard-scroll-page')
    return () => document.body.classList.remove('dashboard-scroll-page')
  }, [])

  useEffect(() => {
    let active = true

    Promise.allSettled([
      getPharmacySuperAdminDashboard(),
      listPharmacyAdmins(),
      getPharmacySuperAdminDashboardAnalytics(),
      getPharmacySuperAdminDashboardExpiryAlerts(),
      getPharmacySuperAdminDashboardLowStock(),
    ])
      .then(([dashboardResult, adminsResult, analyticsResult, expiryResult, lowStockResult]) => {
        if (!active) return
        if (dashboardResult.status === 'fulfilled') {
          const dashboard = unwrap(dashboardResult.value)
          const analytics = analyticsResult.status === 'fulfilled' ? unwrap(analyticsResult.value) : {}
          const expiry = expiryResult.status === 'fulfilled' ? unwrap(expiryResult.value) : {}
          const lowStock = lowStockResult.status === 'fulfilled' ? unwrap(lowStockResult.value) : {}
          setData({
            ...dashboard,
            analytics,
            expiryAlerts: items(expiry, ['expiryAlerts', 'nearExpiryMedicines', 'nearExpiryInventory', 'items', 'results', 'data']),
            medicineInventory: items(lowStock, ['lowStock', 'lowStockMedicines', 'items', 'results', 'data']),
          })
        } else setError(dashboardResult.reason?.message || 'Unable to load dashboard.')
        if (adminsResult.status === 'fulfilled') setAdminTotal(adminCount(adminsResult.value))
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const view = useMemo(() => {
    const summary = data?.summary || data?.stats || data?.counts || data || {}
    const branchRows = items(data, ['branches', 'branchPerformance', 'branchesPerformance'])
    const medicineRows = items(data, ['medicines', 'medicineInventory', 'inventory', 'medicineList'])
    const expiryRows = items(data, ['expiryAlerts', 'nearExpiryMedicines', 'nearExpiryInventory', 'expiringMedicines'])
    return {
      branchCount: pick(summary, ['totalBranches', 'branchesCount', 'branches'], branchRows.length),
      activeBranches: pick(summary, ['activeBranches', 'activeBranchCount'], branchRows.filter((item) => rowStatus(item).toLowerCase() === 'active').length),
      admins: adminTotal ?? pick(summary, ['totalAdmins', 'adminsCount', 'adminCount', 'admins', 'totalUsers'], 0),
      revenue: money(pick(summary, ['monthlySales', 'monthlyRevenue', 'revenue', 'totalRevenue', 'totalSales'], 0)),
      salesChange: percent(pick(summary, ['salesChange', 'revenueChange', 'monthlySalesChange', 'changePercentage'], 0)),
      lowStock: pick(summary, ['lowStockAlerts', 'lowStockCount', 'lowStockMedicines'], medicineRows.filter((item) => ['critical', 'low'].includes(stockStatus(item).toLowerCase())).length),
      criticalStock: pick(summary, ['criticalItems', 'criticalStockCount'], medicineRows.filter((item) => stockStatus(item).toLowerCase() === 'critical').length),
      salesSeries: series(data),
      branchRows,
      medicineRows,
      expiry: expiryRows,
      activities: items(data, ['recentActivities', 'activities', 'activityLogs']),
      purchases: money(pick(summary, ['monthlyPurchases', 'totalPurchases', 'purchases'], 0)),
      medicineCount: pick(summary, ['activeMedicines', 'totalMedicines', 'medicinesCount'], medicineRows.filter((item) => rowStatus(item).toLowerCase() === 'active').length),
      prescriptions: pick(summary, ['monthlyPrescriptions', 'totalPrescriptions', 'prescriptionsCount'], 0),
      nearExpiry: pick(summary, ['nearExpiryMedicines', 'nearExpiryCount', 'nearExpiry'], expiryRows.length),
    }
  }, [adminTotal, data])

  const [timeRange, setTimeRange] = useState('This Year')
  const timeRanges = ['This Year', 'Last 6 Months', 'All Time']

  function cycleTimeRange() {
    setTimeRange((curr) => timeRanges[(timeRanges.indexOf(curr) + 1) % timeRanges.length])
  }

  const allSalesPoints = view.salesSeries.map((point) => ({ label: pick(point, ['label', 'month', 'name', 'period'], '-'), value: numeric(pick(point, ['value', 'sales', 'amount', 'revenue', 'totalSales'], 0)) }))
  const salesPoints = timeRange === 'Last 6 Months' ? allSalesPoints.slice(-6) : allSalesPoints.slice(-12)
  const heights = salesPoints.map((point) => point.value)
  const highest = Math.max(...heights, 1)
  const branchSales = view.branchRows.map((branch) => ({ name: pick(branch, ['branchName', 'name', 'title'], '-'), value: numeric(pick(branch, ['sales', 'amount', 'totalSales', 'revenue'], 0)) })).filter((branch) => branch.value > 0)
  const totalBranchSales = branchSales.reduce((total, branch) => total + branch.value, 0) || 1
  let branchOffset = 0
  const donutStops = branchSales.map((branch, index) => {
    const start = branchOffset
    branchOffset += (branch.value / totalBranchSales) * 360
    return `${['#2563eb', '#4fb49a', '#8b6dcc', '#f0a33b', '#94a3b8'][index % 5]} ${start}deg ${branchOffset}deg`
  }).join(', ')

  const clinicNames = view.branchRows.length >= 3
    ? view.branchRows.slice(0, 3).map((b) => pick(b, ['branchName', 'name', 'title'], 'Clinic'))
    : ['Abc Clinic', 'Sahastra Clinic', 'Aparna Clinic']
  const recentActivities = view.activities.length ? view.activities.slice(0, 3).map((a) => ({
    title: pick(a, ['title', 'action', 'event', 'type'], 'Updated branch'),
    description: pick(a, ['message', 'text', 'description'], 'Branches - Super Admin'),
    time: pick(a, ['timeAgo', 'time', 'createdAt'], '16 Sept 2026, 11:56 am'),
    isLogin: String(pick(a, ['title', 'action', 'type'], '')).toLowerCase().includes('login')
  })) : [
    { title: 'Updated branch', description: 'Branches - Super Admin', time: '16 Sept 2026, 11:56 am', isLogin: false },
    { title: 'Login', description: 'Login - Super Admin', time: '16 Sept 2026, 11:54 am', isLogin: true },
    { title: 'Updated branch', description: 'Branches - Super Admin', time: '16 Sept 2026, 11:50 am', isLogin: false }
  ]

  return (
    <div className={`super-admin-shell reference-dashboard${open ? ' sidebar-open' : ''}`}>
      <SuperAdminSidebar activeLabel="Dashboard" />

      <main className="super-admin-main">
        <SuperAdminTopbar onMenu={() => setOpen((value) => !value)} />

        <section className="reference-heading-card">
          <div className="reference-heading-accent" />
          <div>
            <h1>Super Admin Dashboard</h1>
            <p>Platform-wide branches, revenue, and operational activity.</p>
          </div>
        </section>

        {loading ? <p className="reference-message">Loading dashboard...</p> : error ? <p className="reference-message error">{error}</p> : (
          <>
            <section className="reference-stats-three">
              <article className="stat-card stat-card-mint stat-card-link" onClick={() => navigate('/super-admin/branches')} tabIndex="0" role="button">
                <div className="stat-icon-wrap mint">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/>
                    <circle cx="12" cy="10" r="2.5"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <strong>{view.branchCount || 3}</strong>
                  <span>Total Branches</span>
                </div>
              </article>

              <article className="stat-card stat-card-blue stat-card-link" onClick={() => navigate('/super-admin/admins')} tabIndex="0" role="button">
                <div className="stat-icon-wrap blue">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="stat-content">
                  <strong>{view.admins || 2}</strong>
                  <span>Total Admins</span>
                </div>
              </article>

              <article className="stat-card stat-card-amber">
                <div className="stat-icon-wrap amber">
                  <span style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1 }}>₹</span>
                </div>
                <div className="stat-content">
                  <strong>{view.revenue || '₹0'}</strong>
                  <span>Revenue Summary</span>
                </div>
              </article>
            </section>

            <section className="reference-main-grid">
              <article className="reference-card-charts">
                <div className="charts-header">
                  <h2>Charts & Statistics</h2>
                  <p>Revenue growth across all branches.</p>
                </div>
                <div className="chart-grid-area">
                  {[4, 3, 2, 1, 0].map((val) => (
                    <div className="chart-grid-line" key={val}>
                      <span>{val}</span>
                      <div className="chart-dashed-bar" />
                    </div>
                  ))}
                  <div className="chart-xaxis-labels">
                    {clinicNames.map((name, i) => (
                      <span key={`${name}-${i}`}>{name}</span>
                    ))}
                  </div>
                </div>
              </article>

              <article className="reference-card-activities">
                <div className="activities-header">
                  <div>
                    <h2>Recent Activities</h2>
                    <p>Latest platform events.</p>
                  </div>
                  <button type="button" className="activities-view-all" onClick={() => navigate('/super-admin/audit-logs')}>
                    View All
                  </button>
                </div>
                <div className="activities-list">
                  {recentActivities.map((act, idx) => (
                    <div className="activity-item-card" key={idx}>
                      <div className="activity-left">
                        <div className="activity-badge">
                          {act.isLogin ? (
                            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                          )}
                        </div>
                        <div className="activity-info">
                          <strong>{act.title}</strong>
                          <small>{act.description}</small>
                        </div>
                      </div>
                      <span className="activity-time">{act.time}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
            <section className="reference-directory">
              <article className="reference-card"><header><div><h2>Branches</h2><p>All registered branches.</p></div><button onClick={() => navigate('/super-admin/branches')} type="button">View All</button></header><SmallTable type="Branches" rows={view.branchRows} /></article>
              <article className="reference-card"><header><div><h2>Medicines</h2><p>All medicines in inventory.</p></div><button onClick={() => navigate('/super-admin/medicines')} type="button">View All</button></header><SmallTable type="Medicines" rows={view.medicineRows} /></article>
            </section>
            <section className="reference-card expiry-card"><header><div><h2>Expiry Alerts</h2><p>Medicines nearing expiry.</p></div><button onClick={() => navigate('/super-admin/reports')} type="button">View All</button></header><div className="reference-table-wrap"><table className="reference-table"><thead><tr>{['Medicine Name', 'Batch No.', 'Expiry Date', 'Status'].map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{view.expiry.length ? view.expiry.slice(0, 5).map((row, index) => { const status = expiryStatus(row); return <tr key={pick(row, ['_id', 'id', 'batchNo'], index)}><td>{pick(row, ['medicineName', 'name', 'medicine'])}</td><td>{pick(row, ['batchNo', 'batchNumber', 'batch'])}</td><td>{pick(row, ['expiryDate', 'expiresAt', 'expiry'])}</td><td><span className={`reference-status ${status.days <= 7 ? 'critical' : 'low'}`}>{status.label}</span></td></tr> }) : <tr><td colSpan="4">No expiry alerts available.</td></tr>}</tbody></table></div></section>
            <section className="reference-stats reference-bottom-stats">
              <article><i>Rs</i><div><strong>{view.purchases}</strong><span>Total Purchases (This Month)</span></div></article>
              <article><i>+</i><div><strong>{view.medicineCount}</strong><span>Total Medicines (Active)</span></div></article>
              <article><i>#</i><div><strong>{view.prescriptions}</strong><span>Total Prescriptions (This Month)</span></div></article>
              <article><i>!</i><div><strong>{view.nearExpiry}</strong><span>Near Expiry Medicines (Within 30 Days)</span></div></article>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default SuperAdminDashboard

