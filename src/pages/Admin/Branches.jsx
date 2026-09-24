import { useEffect, useMemo, useState } from 'react'
import RowActions from '../../components/RowActions'
import {
  changePharmacyBranchStatus,
  createPharmacyBranch,
  getPharmacyBranch,
  listPharmacyBranches,
  updatePharmacyBranch,
} from '../../config/api'
import AdminLayout from './AdminLayout'
import '../Super Admin/Branches.css'

const headers = ['S.No.', 'Branch', 'Contact', 'Location', 'Status', 'Actions']
const emptyForm = { name: '', phone: '', email: '', address: '', city: '', state: '', district: '', country: '', postalCode: '', status: 'Active' }

const listFrom = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.branches)) return response.data.branches
  if (Array.isArray(response?.branches)) return response.branches
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  return []
}

function readStoredValue(key) {
  const value = sessionStorage.getItem(key) || localStorage.getItem(key)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const idOf = (branch) => branch?._id || branch?.id || branch?.branchId || branch?.BranchId
const nameOf = (branch) => branch?.name || branch?.branchName || branch?.BranchName || '-'
const statusOf = (branch) => {
  const value = branch?.status ?? branch?.isActive
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive'
  return value || 'Active'
}
const isActive = (branch) => String(statusOf(branch)).toLowerCase() === 'active'
const text = (value, fallback = '-') => String(value || '').trim() || fallback
const locationOf = (branch) => text([branch?.address, branch?.city, branch?.district, branch?.state, branch?.country, branch?.postalCode].filter(Boolean).join(', '))

function payloadFrom(form) {
  return Object.fromEntries(Object.entries(form).filter(([, value]) => String(value || '').trim() !== ''))
}

function buildMainBranch() {
  const assignment = readStoredValue('pharmacyAdminAssignment') || {}
  const user = readStoredValue('pharmacyAdminUser') || {}
  const pharmacy = assignment.pharmacy || user.pharmacy || {}
  const branchId = assignment.branchId || assignment.BranchId || assignment.branch?.id || assignment.branch?.branchId || user.branchId || user.BranchId || user.branch?.id || user.branch?.branchId
  const name = assignment.pharmacyName || pharmacy.name || user.pharmacyName || assignment.branchName || user.branchName
  const address = assignment.pharmacyAddress || pharmacy.address || user.pharmacyAddress || assignment.address || user.address
  const phone = assignment.pharmacyContactNumber || pharmacy.contactNumber || user.pharmacyContactNumber || assignment.mobileNumber || user.mobileNumber
  const email = assignment.pharmacyEmail || pharmacy.email || user.pharmacyEmail || assignment.email || user.email

  if (!name && !address && !phone && !email) return null

  return {
    id: branchId || pharmacyId || 'main',
    branchId: branchId || pharmacyId || 'main',
    name: name || 'Main Branch',
    branchName: name || 'Main Branch',
    phone,
    email,
    address,
    city: assignment.city || pharmacy.city || user.city,
    district: assignment.district || pharmacy.district || user.district,
    state: assignment.state || pharmacy.state || user.state,
    country: assignment.country || pharmacy.country || user.country,
    postalCode: assignment.postalCode || pharmacy.postalCode || user.postalCode,
    status: 'Active',
    isMainBranch: true,
  }
}

function BranchNameCell({ branch, index }) {
  const id = idOf(branch) || index + 1
  return <span className="branches-name-cell"><span className="branches-location-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span><span><strong>{nameOf(branch)}</strong><small>{branch?.isMainBranch ? 'Main Branch' : `Sub Branch - ID: ${id}`}</small></span></span>
}

function ContactCell({ branch }) {
  return <span className="branches-contact-cell"><strong>{text(branch?.phone || branch?.phoneNumber || branch?.contactNumber)}</strong><small>{text(branch?.email)}</small></span>
}

function StatusBadge({ branch }) {
  return <span className={`branches-status-pill ${isActive(branch) ? 'active' : 'inactive'}`}><i />{isActive(branch) ? 'Active' : 'Inactive'}</span>
}

export default function AdminBranches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [currentBranch, setCurrentBranch] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const mainBranch = useMemo(() => buildMainBranch(), [])
  const displayBranches = useMemo(() => mainBranch ? [mainBranch, ...branches] : branches, [mainBranch, branches])

  async function loadBranches() {
    setLoading(true)
    setError('')
    try {
      const response = await listPharmacyBranches()
      setBranches(listFrom(response))
    } catch (requestError) {
      setError(requestError.message || 'Unable to load sub branches.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBranches() }, [])

  function openCreate() {
    setCurrentBranch(null)
    setForm(emptyForm)
    setModal('form')
  }

  async function openView(branch) {
    if (branch?.isMainBranch) {
      setCurrentBranch(branch)
      setModal('view')
      return
    }
    const id = idOf(branch)
    setCurrentBranch(branch)
    setModal('view')
    if (!id) return
    try {
      const response = await getPharmacyBranch(id)
      setCurrentBranch(response?.data || response?.branch || response)
    } catch {
      setCurrentBranch(branch)
    }
  }

  function openEdit(branch) {
    if (branch?.isMainBranch) return
    setCurrentBranch(branch)
    setForm({
      name: nameOf(branch) === '-' ? '' : nameOf(branch),
      phone: branch?.phone || branch?.phoneNumber || '',
      email: branch?.email || '',
      address: branch?.address || '',
      city: branch?.city || '',
      state: branch?.state || '',
      district: branch?.district || '',
      country: branch?.country || '',
      postalCode: branch?.postalCode || branch?.pincode || '',
      status: statusOf(branch),
    })
    setModal('form')
  }

  async function saveBranch(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = payloadFrom(form)
      if (currentBranch) await updatePharmacyBranch(idOf(currentBranch), payload)
      else await createPharmacyBranch(payload)
      setModal(null)
      await loadBranches()
    } catch (requestError) {
      setError(requestError.message || 'Unable to save sub branch.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(branch) {
    if (branch?.isMainBranch) return
    const id = idOf(branch)
    if (!id) return
    const nextActive = !isActive(branch)
    const nextStatus = nextActive ? 'Active' : 'Inactive'
    setBranches((items) => items.map((item) => idOf(item) === id ? { ...item, status: nextStatus, isActive: nextActive } : item))
    try {
      await changePharmacyBranchStatus(id, { status: nextStatus, isActive: nextActive, IsActive: nextActive })
    } catch (requestError) {
      setError(requestError.message || 'Unable to update sub branch status.')
      loadBranches()
    }
  }

  function chooseBranch(branch) {
    const selected = { id: idOf(branch), name: nameOf(branch), type: branch?.isMainBranch ? 'main' : 'sub' }
    sessionStorage.setItem('workingBranchId', selected.id || '')
    sessionStorage.setItem('workingBranch', JSON.stringify(selected))
  }

  const rows = useMemo(() => displayBranches.map((branch, index) => {
    const id = idOf(branch) || index
    const actions = branch?.isMainBranch
      ? <span className="row-actions" key={`actions-${id}`}><button className="row-action-button view" type="button" title={idOf(branch) ? 'Use main branch' : 'Create a sub branch first'} disabled={!idOf(branch)} onClick={() => chooseBranch(branch)}>Use</button><RowActions itemName={nameOf(branch)} isActive={true} onView={() => openView(branch)} /></span>
      : <span className="row-actions" key={`actions-${id}`}><button className="row-action-button view" type="button" title="Use sub branch" onClick={() => chooseBranch(branch)}>Use</button><RowActions itemName={nameOf(branch)} isActive={isActive(branch)} onView={() => openView(branch)} onEdit={() => openEdit(branch)} onStatus={() => toggleStatus(branch)} /></span>
    return [
      <span className="branches-serial" key="serial">{index + 1}</span>,
      <BranchNameCell key="branch" branch={branch} index={index} />,
      <ContactCell key="contact" branch={branch} />,
      <span className="branches-location-text" key="location" title={locationOf(branch)}>{locationOf(branch)}</span>,
      <StatusBadge key="status" branch={branch} />,
      actions,
    ]
  }), [displayBranches])

  return (
    <AdminLayout activeLabel="Branches" title="Branches" subtitle="Main pharmacy branch and sub branches.">
      <section className="super-admin-module-panel">
        <div className="super-admin-module-header">
          <h2>Branches</h2>
          <button type="button" className="sa-btn-primary" onClick={openCreate}>+ Add Sub Branch</button>
        </div>
        {error ? <div className="super-admin-module-error">{error}</div> : null}
        <div className="super-admin-module-table">
          <table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={headers.length}>Loading branches...</td></tr> : rows.length ? rows.map((row, index) => <tr key={idOf(displayBranches[index]) || index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No branch details available.</td></tr>}</tbody></table>
        </div>
      </section>

      {modal === 'view' && currentBranch ? <div className="sa-modal-backdrop" onClick={() => setModal(null)}><div className="sa-modal-card" onClick={(event) => event.stopPropagation()}><div className="sa-modal-header"><h2>{nameOf(currentBranch)}</h2><button type="button" className="sa-modal-close" onClick={() => setModal(null)}>&times;</button></div><div className="sa-modal-body"><div className="sa-modal-grid">{['phone', 'email', 'address', 'city', 'district', 'state', 'country', 'postalCode'].map((field) => <div className="sa-modal-field" key={field}><label>{field}</label><span>{text(currentBranch?.[field])}</span></div>)}</div></div><div className="sa-modal-footer"><button type="button" className="sa-btn-secondary" onClick={() => setModal(null)}>Close</button></div></div></div> : null}

      {modal === 'form' ? <div className="sa-modal-backdrop" onClick={() => setModal(null)}><form className="sa-modal-card" onSubmit={saveBranch} onClick={(event) => event.stopPropagation()}><div className="sa-modal-header"><h2>{currentBranch ? 'Edit Sub Branch' : 'Create Sub Branch'}</h2><button type="button" className="sa-modal-close" onClick={() => setModal(null)}>&times;</button></div><div className="sa-modal-body"><div className="sa-modal-grid">{Object.keys(emptyForm).map((field) => <div className="sa-modal-field" key={field} style={field === 'address' ? { gridColumn: '1 / -1' } : undefined}><label>{field === 'name' ? 'Sub Branch Name *' : field}</label>{field === 'address' ? <textarea value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /> : field === 'status' ? <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="Active">Active</option><option value="Inactive">Inactive</option></select> : <input required={field === 'name'} type={field === 'email' ? 'email' : 'text'} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />}</div>)}</div></div><div className="sa-modal-footer"><button type="button" className="sa-btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="sa-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Sub Branch'}</button></div></form></div> : null}
    </AdminLayout>
  )
}


