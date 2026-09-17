import { useEffect, useMemo, useState } from 'react'
import { changeSuperAdminMedicineStatus, getSuperAdminMedicines } from '../../config/api'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import './Medicines.css'

function Icon({ name }) {
  const paths = {
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    select: <><path d="m5 12 4 4L19 6" /><rect x="3" y="3" width="18" height="18" rx="2" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
    package: <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.medicines)) return response.data.medicines
  if (Array.isArray(response?.medicines)) return response.medicines
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  return []
}

function medicineName(item) {
  return item?.name || item?.medicineName || item?.brandName || '-'
}

function brandName(item) {
  return item?.brand || item?.brandName || item?.manufacturer || item?.company || '-'
}

function categoryName(item) {
  return item?.category || item?.categoryName || item?.type || '-'
}

function stockValue(item) {
  return Number(item?.stock ?? item?.currentStock ?? item?.quantity ?? item?.qty ?? 0) || 0
}

function stockState(item) {
  const stock = stockValue(item)
  const minimum = Number(item?.minStock ?? item?.minimumStock ?? item?.reorderLevel ?? 0) || 0
  if (stock <= 0) return 'out'
  if (minimum > 0 && stock <= minimum) return 'low'
  return 'in'
}

function medicineStatus(item) {
  const value = item?.status ?? item?.isActive ?? item?.isAvailable ?? item?.available
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive'
  return value || 'Active'
}

function medicineId(item) {
  return item?._id || item?.id || item?.medicineId
}

function priceValue(item) {
  const value = item?.price ?? item?.mrp ?? item?.priceMrp ?? item?.sellingPrice
  if (value === undefined || value === null || value === '') return '-'
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function Medicines() {
  const [medicines, setMedicines] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  useEffect(() => {
    let active = true
    async function loadMedicines() {
      setLoading(true)
      setError('')
      try {
        const response = await getSuperAdminMedicines()
        if (active) setMedicines(normalizeList(response))
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load medicines.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadMedicines()
    return () => { active = false }
  }, [])

  const filteredMedicines = useMemo(() => {
    const value = query.trim().toLowerCase()
    return medicines.filter((medicine) => {
      const matchesQuery = !value || [medicineName(medicine), brandName(medicine), categoryName(medicine), medicine?.sku, medicine?.SKU].join(' ').toLowerCase().includes(value)
      const matchesFilter = filter === 'All' || (filter === 'Active' && medicineStatus(medicine).toLowerCase() === 'active') || (filter === 'Inactive' && medicineStatus(medicine).toLowerCase() !== 'active') || (filter === 'Low Stock' && ['low', 'out'].includes(stockState(medicine)))
      return matchesQuery && matchesFilter
    })
  }, [filter, medicines, query])

  const [viewingMedicine, setViewingMedicine] = useState(null)
  const [editingMedicine, setEditingMedicine] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', brand: '', category: '', price: '', stock: '', status: 'Active' })

  function openView(medicine) {
    setViewingMedicine(medicine)
  }

  function openEdit(medicine) {
    setEditingMedicine(medicine)
    setEditForm({
      name: medicineName(medicine),
      brand: brandName(medicine),
      category: categoryName(medicine),
      price: medicine?.price ?? medicine?.mrp ?? medicine?.sellingPrice ?? '',
      stock: stockValue(medicine),
      status: medicineStatus(medicine)
    })
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    const id = medicineId(editingMedicine)
    setMedicines((current) => current.map((item) => {
      if (medicineId(item) === id) {
        return {
          ...item,
          name: editForm.name,
          medicineName: editForm.name,
          brand: editForm.brand,
          brandName: editForm.brand,
          category: editForm.category,
          categoryName: editForm.category,
          price: editForm.price,
          mrp: editForm.price,
          stock: Number(editForm.stock) || 0,
          status: editForm.status,
          isActive: editForm.status === 'Active'
        }
      }
      return item
    }))
    setEditingMedicine(null)
  }

  function handleDelete(medicine) {
    const name = medicineName(medicine)
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
    const id = medicineId(medicine)
    setMedicines((current) => current.filter((item) => medicineId(item) !== id))
  }

  useEffect(() => setPage(1), [filter, query])

  const pageCount = Math.max(1, Math.ceil(filteredMedicines.length / pageSize))
  const visibleMedicines = filteredMedicines.slice((page - 1) * pageSize, page * pageSize)

  async function toggleStatus(medicine) {
    const id = medicineId(medicine)
    if (!id) return
    const currentStatus = medicineStatus(medicine).toLowerCase()
    const nextStatus = currentStatus === 'active' ? 'Inactive' : 'Active'
    try {
      await changeSuperAdminMedicineStatus(id, { status: nextStatus, isActive: nextStatus === 'Active' })
      setMedicines((current) => current.map((item) => medicineId(item) === id ? { ...item, status: nextStatus, isActive: nextStatus === 'Active' } : item))
    } catch (requestError) {
      setError(requestError.message || 'Unable to change medicine status.')
    }
  }

  return (
    <div className="super-admin-shell medicines-page">
      <SuperAdminSidebar activeLabel="Medicines" />
      <main className="super-admin-main">
        <SuperAdminTopbar onMenu={() => {}} />
        <section className="medicines-heading"><p>Super Admin</p><h1>Medicines</h1><span>{loading ? 'Loading medicines...' : error ? 'Unable to load medicines' : `${filteredMedicines.length} medicines found`}</span></section>
        <section className="medicines-panel">
          <header className="medicines-card-header"><div><h2>Medicines</h2><p>{loading ? 'Loading data...' : `${filteredMedicines.length} medicines found`}</p></div><div className="medicines-filters"><label className="medicines-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search medicines by name, brand, or SKU..." /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter medicines"><option>All</option><option>Active</option><option>Inactive</option><option>Low Stock</option></select></div></header>
          <div className="medicines-table-wrap"><table className="medicines-table"><thead><tr><th>S.No</th><th>Medicine Name</th><th>Brand</th><th>Category</th><th>SKU</th><th>Stock</th><th>Price (MRP)</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="9"><div className="medicines-loading"><span /><span /><span />Loading medicines...</div></td></tr> : error ? <tr><td colSpan="9"><div className="medicines-state medicines-error"><Icon name="package" /><strong>Unable to load medicines</strong><small>{error}</small></div></td></tr> : visibleMedicines.length ? visibleMedicines.map((medicine, index) => { const stock = stockState(medicine); const status = medicineStatus(medicine); return <tr key={medicine?._id || medicine?.id || `${medicineName(medicine)}-${index}`}><td>{(page - 1) * pageSize + index + 1}</td><td><span className="medicine-name"><span className="medicine-icon"><Icon name="package" /></span>{medicineName(medicine)}</span></td><td>{brandName(medicine)}</td><td>{categoryName(medicine)}</td><td>{medicine?.sku || medicine?.SKU || medicine?.code || '-'}</td><td><span className={`medicine-stock ${stock}`}><i />{stockValue(medicine)}</span></td><td>{priceValue(medicine)}</td><td><span className={`medicine-status ${status.toLowerCase()}`}>{status}</span></td><td><span className="medicine-actions"><button className="view" type="button" title={`View ${medicineName(medicine)}`} aria-label={`View ${medicineName(medicine)}`} onClick={() => openView(medicine)}><Icon name="eye" /></button><button className="edit" type="button" title={`Edit ${medicineName(medicine)}`} aria-label={`Edit ${medicineName(medicine)}`} onClick={() => openEdit(medicine)}><Icon name="edit" /></button><button className="select" type="button" title={`${status.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} ${medicineName(medicine)}`} aria-label={`${status.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} ${medicineName(medicine)}`} onClick={() => toggleStatus(medicine)}><Icon name="select" /></button><button className="danger" type="button" title={`Delete ${medicineName(medicine)}`} aria-label={`Delete ${medicineName(medicine)}`} onClick={() => handleDelete(medicine)}><Icon name="trash" /></button></span></td></tr> }) : <tr><td colSpan="9"><div className="medicines-state"><Icon name="package" /><strong>No medicines found</strong><small>Medicines from the API will appear here when available.</small></div></td></tr>}</tbody></table></div>
          <footer className="medicines-footer"><span>Showing {visibleMedicines.length} of {filteredMedicines.length} medicines</span><div><button type="button" onClick={() => setPage(1)} disabled={page === 1}>First</button><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Prev</button><strong>Page {page} of {pageCount}</strong><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>Next</button><button type="button" onClick={() => setPage(pageCount)} disabled={page === pageCount}>Last</button></div></footer>
        </section>
      </main>

      {viewingMedicine && (
        <div className="sa-modal-backdrop" onClick={() => setViewingMedicine(null)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Medicine Details: {medicineName(viewingMedicine)}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setViewingMedicine(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Medicine Name</label>
                  <span>{medicineName(viewingMedicine)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Brand / Manufacturer</label>
                  <span>{brandName(viewingMedicine)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Category</label>
                  <span>{categoryName(viewingMedicine)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>SKU / Code</label>
                  <span><code>{viewingMedicine?.sku || viewingMedicine?.SKU || viewingMedicine?.code || '-'}</code></span>
                </div>
                <div className="sa-modal-field">
                  <label>Stock Available</label>
                  <span>{stockValue(viewingMedicine)} units</span>
                </div>
                <div className="sa-modal-field">
                  <label>Price (MRP)</label>
                  <span>{priceValue(viewingMedicine)}</span>
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <span>{medicineStatus(viewingMedicine)}</span>
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setViewingMedicine(null)}>Close</button>
              <button type="button" className="sa-btn-primary" onClick={() => { const med = viewingMedicine; setViewingMedicine(null); openEdit(med) }}>Edit Medicine</button>
            </div>
          </div>
        </div>
      )}

      {editingMedicine && (
        <div className="sa-modal-backdrop" onClick={() => setEditingMedicine(null)}>
          <form className="sa-modal-card" onSubmit={handleSaveEdit} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Edit Medicine</h2>
              <button type="button" className="sa-modal-close" onClick={() => setEditingMedicine(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field">
                  <label>Medicine Name</label>
                  <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="sa-modal-field">
                  <label>Brand / Manufacturer</label>
                  <input value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} />
                </div>
                <div className="sa-modal-field">
                  <label>Category</label>
                  <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                </div>
                <div className="sa-modal-field">
                  <label>Price (₹)</label>
                  <input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                </div>
                <div className="sa-modal-field">
                  <label>Stock Count</label>
                  <input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} />
                </div>
                <div className="sa-modal-field">
                  <label>Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setEditingMedicine(null)}>Cancel</button>
              <button type="submit" className="sa-btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Medicines
