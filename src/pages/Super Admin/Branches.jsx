import { useEffect, useMemo, useState } from 'react'
import { listPharmacyAdmins } from '../../config/api'
import SuperAdminModulePage from './SuperAdminModulePage'
import RowActions from '../../components/RowActions'
import './Branches.css'

const headers = ['S.No.', 'Pharmacy Name', 'Contact Number', 'Address', 'Email ID', 'Status', 'Actions']

function listFrom(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.admins)) return response.data.admins
  if (Array.isArray(response?.admins)) return response.admins
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  return []
}

function unwrapAdmin(item) {
  return item?.admin || item?.data?.admin || item?.data || item || {}
}

function text(value, fallback = '-') {
  if (value === undefined || value === null) return fallback
  const output = String(value).trim()
  return output ? output : fallback
}

function idOf(item) {
  const admin = unwrapAdmin(item)
  return admin.pharmacyId || admin.PharmacyId || admin.id || admin.adminId || admin._id
}

function pharmacyName(item) {
  const admin = unwrapAdmin(item)
  return text(admin.pharmacyName || admin.PharmacyName || admin.pharmacy?.name || admin.pharmacy?.pharmacyName)
}

function contactNumber(item) {
  const admin = unwrapAdmin(item)
  return text(admin.pharmacyContactNumber || admin.PharmacyContactNumber || admin.mobileNumber || admin.MobileNumber || admin.phone || admin.mobile)
}

function emailOf(item) {
  const admin = unwrapAdmin(item)
  return text(admin.pharmacyEmail || admin.PharmacyEmail || admin.email)
}

function addressOf(item) {
  const admin = unwrapAdmin(item)
  const address = admin.pharmacyAddress || admin.PharmacyAddress || admin.address || admin.pharmacy?.address
  const location = [admin.city || admin.City, admin.state || admin.State, admin.country || admin.Country, admin.postalCode || admin.PostalCode].filter(Boolean).join(', ')
  return text([address, location].filter((part) => text(part, '')).join(', '))
}

function statusOf(item) {
  const admin = unwrapAdmin(item)
  const value = admin.accountStatus || admin.status || admin.isActive
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive'
  return text(value, 'Active')
}

function PharmacyNameCell({ pharmacy, index }) {
  const name = pharmacyName(pharmacy)
  const id = idOf(pharmacy) || index + 1
  return <span className="branches-name-cell"><span className="branches-location-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18" /><path d="M5 21V7l8-4 6 3v15" /><path d="M9 9h1M9 13h1M9 17h1M14 10h1M14 14h1M14 18h1" /></svg></span><span><strong>{name}</strong><small>Pharmacy ID: {id}</small></span></span>
}

function ContactCell({ pharmacy }) {
  return <span className="branches-contact-cell"><strong>{contactNumber(pharmacy)}</strong><small>{emailOf(pharmacy)}</small></span>
}

function StatusBadge({ status }) {
  const isActive = String(status).toLowerCase() === 'active'
  return <span className={`branches-status-pill ${isActive ? 'active' : 'inactive'}`}><i />{isActive ? 'Active' : 'Inactive'}</span>
}

export default function Pharmacies() {
  const [pharmacies, setPharmacies] = useState([])
  const [viewingPharmacy, setViewingPharmacy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPharmacies() {
      setLoading(true)
      setError('')
      try {
        const response = await listPharmacyAdmins()
        if (!active) return
        const admins = listFrom(response).map(unwrapAdmin)
        const unique = new Map()
        admins.forEach((admin) => {
          const key = admin.pharmacyId || admin.PharmacyId || admin.pharmacyName || admin.email || admin.id
          if (!key) return
          if (!unique.has(String(key))) unique.set(String(key), admin)
        })
        setPharmacies([...unique.values()])
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load pharmacies.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPharmacies()
    return () => { active = false }
  }, [])

  const rows = useMemo(() => pharmacies.map((pharmacy, index) => {
    const status = statusOf(pharmacy)
    return [
      <span className="branches-serial" key="serial">{index + 1}</span>,
      <PharmacyNameCell key="name" pharmacy={pharmacy} index={index} />,
      <ContactCell key="contact" pharmacy={pharmacy} />,
      <span className="branches-location-text" key="address" title={addressOf(pharmacy)}>{addressOf(pharmacy)}</span>,
      <span className="branches-location-text" key="email" title={emailOf(pharmacy)}>{emailOf(pharmacy)}</span>,
      <StatusBadge key="status" status={status} />,
      <RowActions key={`actions-${idOf(pharmacy) || index}`} itemName={pharmacyName(pharmacy)} isActive={String(status).toLowerCase() === 'active'} onView={() => setViewingPharmacy(pharmacy)} />,
    ]
  }), [pharmacies])

  return (
    <SuperAdminModulePage
      title="Pharmacies"
      headers={headers}
      rows={rows}
      loading={loading}
      error={error}
      action={null}
      emptyText="No pharmacies available."
    >
      {viewingPharmacy ? (
        <div className="sa-modal-backdrop" onClick={() => setViewingPharmacy(null)}>
          <div className="sa-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Pharmacy Details: {pharmacyName(viewingPharmacy)}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setViewingPharmacy(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-modal-grid">
                <div className="sa-modal-field"><label>Pharmacy Name</label><span>{pharmacyName(viewingPharmacy)}</span></div>
                <div className="sa-modal-field"><label>Contact Number</label><span>{contactNumber(viewingPharmacy)}</span></div>
                <div className="sa-modal-field"><label>Email ID</label><span>{emailOf(viewingPharmacy)}</span></div>
                <div className="sa-modal-field"><label>Status</label><span>{statusOf(viewingPharmacy)}</span></div>
                <div className="sa-modal-field" style={{ gridColumn: '1 / -1' }}><label>Address / Location</label><span>{addressOf(viewingPharmacy)}</span></div>
              </div>
            </div>
            <div className="sa-modal-footer"><button type="button" className="sa-btn-secondary" onClick={() => setViewingPharmacy(null)}>Close</button></div>
          </div>
        </div>
      ) : null}
    </SuperAdminModulePage>
  )
}
