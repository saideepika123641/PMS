import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../components/ToastProvider'
import {
  getPharmacyCmsOptions,
  getPharmacySettings,
  updatePharmacyCmsIntegration,
} from '../../config/api'
import AdminLayout from './AdminLayout'
import './Settings.css'

const emptyForm = { operationMode: 'standalone', hospitalId: '', branchId: '' }

const unwrap = (response) => response?.data || response || {}
const list = (source, keys) => keys.map((key) => source?.[key]).find(Array.isArray) || []
const pick = (source, keys, fallback = '') => keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback
const idOf = (item) => item?._id || item?.id || item?.hospitalId || item?.branchId || item?.externalId || ''
const nameOf = (item) => item?.name || item?.hospitalName || item?.branchName || item?.title || item?.displayName || idOf(item) || '-'

export default function CmsIntegration() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(null)
  const [options, setOptions] = useState({ hospitals: [], branches: [] })
  const [form, setForm] = useState(emptyForm)

  const selectedHospital = useMemo(() => options.hospitals.find((item) => String(idOf(item)) === String(form.hospitalId)), [form.hospitalId, options.hospitals])
  const selectedBranch = useMemo(() => options.branches.find((item) => String(idOf(item)) === String(form.branchId)), [form.branchId, options.branches])
  const cmsInfo = settings?.cmsIntegration || settings?.cms || settings?.cmsLink || {}
  const pharmacyId = pick(settings, ['pharmacyId', 'PharmacyId', '_id', 'id'], '-')

  async function loadCmsOptions(hospitalId = '') {
    const response = await getPharmacyCmsOptions(hospitalId ? { hospitalId } : {})
    const data = unwrap(response)
    const hospitals = list(data, ['hospitals', 'cmsHospitals', 'hospitalOptions', 'items'])
    const branches = list(data, ['branches', 'cmsBranches', 'branchOptions', 'items'])
    setOptions((current) => ({
      hospitals: hospitals.length ? hospitals : current.hospitals,
      branches,
    }))
  }

  async function load() {
    setLoading(true)
    try {
      const settingsResponse = await getPharmacySettings()
      const data = unwrap(settingsResponse)
      const link = data?.cmsIntegration || data?.cms || data?.cmsLink || {}
      const nextHospitalId = pick(link, ['hospitalId', 'cmsHospitalId', 'externalHospitalId'], '')
      setSettings(data)
      setForm({
        operationMode: pick(data, ['operationMode', 'mode'], pick(link, ['operationMode', 'mode'], 'standalone')),
        hospitalId: nextHospitalId,
        branchId: pick(link, ['branchId', 'cmsBranchId', 'externalBranchId'], ''),
      })
      await loadCmsOptions(nextHospitalId)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleHospitalChange(value) {
    setForm((current) => ({ ...current, hospitalId: value, branchId: '' }))
    try {
      await loadCmsOptions(value)
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function saveIntegration(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        operationMode: form.operationMode,
        hospitalId: form.operationMode === 'cms' ? form.hospitalId : null,
        branchId: form.operationMode === 'cms' ? form.branchId : null,
        connected: form.operationMode === 'cms',
      }
      const response = await updatePharmacyCmsIntegration(payload)
      showToast(response?.message || 'CMS integration updated successfully.')
      await load()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    setSaving(true)
    try {
      const response = await updatePharmacyCmsIntegration({ operationMode: 'standalone', hospitalId: null, branchId: null, connected: false })
      showToast(response?.message || 'CMS integration disconnected.')
      await load()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout activeLabel="CMS Integration" title="CMS Integration" subtitle="Admin / CMS Integration">
      <div className="stock-scroll-area">
        <div className="settings-layout-container">
          <section className="settings-section-card">
            <h2>Pharmacy Operation Mode</h2>
            {loading ? <p className="settings-status-msg">Loading CMS integration...</p> : null}
            {!loading ? (
              <form onSubmit={saveIntegration}>
                <div className="settings-form-grid">
                  <div className="settings-form-group">
                    <label>Pharmacy ID</label>
                    <input value={pharmacyId} disabled />
                  </div>
                  <div className="settings-form-group">
                    <label>Operation Mode</label>
                    <select value={form.operationMode} onChange={(event) => setForm({ ...form, operationMode: event.target.value })}>
                      <option value="standalone">Standalone</option>
                      <option value="cms">With CMS</option>
                    </select>
                  </div>
                  <div className="settings-form-group">
                    <label>CMS Hospital</label>
                    <select value={form.hospitalId} onChange={(event) => handleHospitalChange(event.target.value)} disabled={form.operationMode !== 'cms'} required={form.operationMode === 'cms'}>
                      <option value="">Select hospital</option>
                      {options.hospitals.map((hospital) => <option key={idOf(hospital)} value={idOf(hospital)}>{nameOf(hospital)}</option>)}
                    </select>
                  </div>
                  <div className="settings-form-group">
                    <label>CMS Branch</label>
                    <select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} disabled={form.operationMode !== 'cms'} required={form.operationMode === 'cms'}>
                      <option value="">Select branch</option>
                      {options.branches.map((branch) => <option key={idOf(branch)} value={idOf(branch)}>{nameOf(branch)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="settings-save-bar">
                  <button type="button" disabled={saving || form.operationMode !== 'cms'} onClick={disconnect}>Disconnect</button>
                  <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save CMS Mapping'}</button>
                </div>
              </form>
            ) : null}
          </section>

          <section className="settings-section-card">
            <h2>Current CMS Link</h2>
            <div className="branch-table-wrap">
              <table className="branch-table">
                <tbody>
                  <tr><th>Mode</th><td>{form.operationMode || '-'}</td></tr>
                  <tr><th>Hospital</th><td>{selectedHospital ? nameOf(selectedHospital) : pick(cmsInfo, ['hospitalName', 'cmsHospitalName'], '-')}</td></tr>
                  <tr><th>Branch</th><td>{selectedBranch ? nameOf(selectedBranch) : pick(cmsInfo, ['branchName', 'cmsBranchName'], '-')}</td></tr>
                  <tr><th>Status</th><td>{pick(cmsInfo, ['status', 'connectionStatus'], form.operationMode === 'cms' ? 'Connected' : 'Standalone')}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  )
}
