import { useMemo, useState } from 'react'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import './SuperAdminModulePage.css'

function SuperAdminModulePage({ title, headers = [], rows = [], loading = false, error = '', action = null, children = null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const tableHeaders = headers.length ? headers : ['Name', 'Details', 'Status']

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return rows
    return rows.filter((row) => row.map((cell) => String(cell ?? '')).join(' ').toLowerCase().includes(normalizedQuery))
  }, [query, rows])

  return (
    <div className={`super-admin-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
      <SuperAdminSidebar activeLabel={title} />

      <main className="super-admin-main">
        <SuperAdminTopbar onMenu={() => setSidebarOpen((value) => !value)} />

        <div className="super-admin-content">
          <section className="super-admin-module-heading">
            <p className="super-admin-eyebrow">Super Admin</p>
            <h1>{title}</h1>
          </section>

          <section className="super-admin-panel super-admin-module-panel">
            <div className="super-admin-module-header">
              <div>
                <h2>{title}</h2>
                <p>{loading ? 'Loading data...' : error || ''}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="super-admin-module-filter">
                  <span aria-hidden="true">Search</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Filter ${title.toLowerCase()}...`} />
                </label>
                {action}
              </div>
            </div>

            <div className="super-admin-module-table">
              <table>
                <thead>
                  <tr>{tableHeaders.map((header) => <th key={header}>{header}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={tableHeaders.length}>Loading data...</td></tr>
                  ) : filteredRows.length ? (
                    filteredRows.map((row, rowIndex) => (
                      <tr key={`${title}-${rowIndex}`}>
                        {tableHeaders.map((header, cellIndex) => <td key={header}>{row[cellIndex] ?? '-'}</td>)}
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={tableHeaders.length}>No data available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      {children}
    </div>
  )
}

export default SuperAdminModulePage

