import { useEffect, useMemo, useState } from 'react'
import { assignPharmacyAdminRole, getPharmacyAdminRole, getSuperAdminRolePermissions, listPharmacyAdmins, listSuperAdminRoles, updateSuperAdminRolePermissions } from '../../config/api'
import { PERMISSION_ACTIONS, emptyPermissions, normalizePermissions, serializePermissions } from '../../config/permissions'
import SidebarIcon from '../../components/SidebarIcon'
import { adminNavigation } from '../Admin/adminNavigation'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar from './SuperAdminTopbar'
import './UsersPermissions.css'

const ADMIN_PERMISSION_MODULES = adminNavigation.map(({ label, iconName }) => ({
  label: label === 'Pharmacists' ? 'Users' : label,
  sidebarLabel: label,
  iconName,
}))
const MODULES = ADMIN_PERMISSION_MODULES.map((module) => module.label)
const ACTIONS = PERMISSION_ACTIONS
const EMPTY_PERMISSIONS = emptyPermissions(MODULES)

function Icon({ children }) {
  return <svg className="permissions-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>
}

function ModuleIcon({ module }) {
  const sidebarModule = ADMIN_PERMISSION_MODULES.find((item) => item.label === module || item.sidebarLabel === module)
  const iconClass = String(sidebarModule?.iconName || module).toLowerCase().replace(/\s+/g, '-')
  return <span className={`module-icon module-icon-${iconClass}`} aria-hidden="true"><SidebarIcon name={sidebarModule?.iconName || 'dashboard'} /></span>
}

function listFrom(response, keys = ['data', 'items', 'results', 'roles', 'admins']) {
  if (Array.isArray(response)) return response
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key]
    if (Array.isArray(response?.data?.[key])) return response.data[key]
  }
  return []
}

function idOf(item) {
  return item?._id || item?.id || item?.roleId || item?.adminId || item?.adminUserId || item?.userId || item?.uuid
}

function nameOf(item) {
  return item?.name || item?.roleName || item?.fullName || item?.adminName || item?.email || 'Unnamed'
}

function roleIdFrom(response, fallback = '') {
  const source = response?.data?.role || response?.data || response?.role || response || {}
  return idOf(source) || source?.pharmacyPermissionRoleId || source?.roleId || fallback
}

function permissionSource(response, fallback) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  return response?.data?.permissions
    || response?.data?.Permissions
    || response?.permissions
    || response?.Permissions
    || response?.data?.modulePermissions
    || response?.data?.ModulePermissions
    || response?.modulePermissions
    || response?.ModulePermissions
    || response?.data?.role?.permissions
    || response?.data?.role?.Permissions
    || response?.role?.permissions
    || response?.role?.Permissions
    || fallback
}

function permissionPayload(permissions) {
  return { permissions: serializePermissions(permissions, MODULES).modulePermissions }
}

function permissionCount(permissions) {
  return Object.values(permissions || {}).reduce((total, actions) => total + Object.values(actions || {}).filter(Boolean).length, 0)
}

function hasAnyPermission(permissions) {
  return permissionCount(permissions) > 0
}

function actionLabel(action) {
  return action.charAt(0).toUpperCase() + action.slice(1)
}

export default function UsersPermissions() {
  const [admins, setAdmins] = useState([])
  const [roles, setRoles] = useState([])
  const [adminRoles, setAdminRoles] = useState({})
  const [selectedAdminId, setSelectedAdminId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function loadRolePermissions(roleId) {
    if (!roleId) {
      setPermissions(EMPTY_PERMISSIONS)
      return
    }
    setLoadingPermissions(true)
    try {
      const response = await getSuperAdminRolePermissions(roleId)
      setPermissions(normalizePermissions(permissionSource(response, EMPTY_PERMISSIONS), MODULES))
    } catch (requestError) {
      if (/Invalid permission module/i.test(requestError.message || '')) {
        setError('')
        setPermissions(EMPTY_PERMISSIONS)
      } else {
        setError(requestError.message || 'Unable to load permissions for this admin role.')
        setPermissions(EMPTY_PERMISSIONS)
      }
    } finally {
      setLoadingPermissions(false)
    }
  }

  async function loadAdminRoles(loadedAdmins) {
    const pairs = await Promise.all(loadedAdmins.map(async (admin) => {
      const adminId = idOf(admin)
      if (!adminId) return null
      try {
        const response = await getPharmacyAdminRole(adminId)
        return [String(adminId), String(roleIdFrom(response, admin?.pharmacyPermissionRoleId || admin?.roleId || ''))]
      } catch {
        return [String(adminId), String(admin?.pharmacyPermissionRoleId || admin?.roleId || '')]
      }
    }))
    return Object.fromEntries(pairs.filter(Boolean))
  }

  async function loadData() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const [adminResponse, roleResponse] = await Promise.all([listPharmacyAdmins(), listSuperAdminRoles()])
      const loadedAdmins = listFrom(adminResponse, ['admins', 'items', 'results', 'data'])
      const loadedRoles = listFrom(roleResponse, ['roles', 'items', 'results', 'data'])
      const roleMap = await loadAdminRoles(loadedAdmins)
      const firstAdminId = idOf(loadedAdmins[0]) || ''
      const firstRoleId = roleMap[String(firstAdminId)] || idOf(loadedRoles[0]) || ''
      setAdmins(loadedAdmins)
      setRoles(loadedRoles)
      setAdminRoles(roleMap)
      setSelectedAdminId(firstAdminId)
      setSelectedRoleId(firstRoleId)
      await loadRolePermissions(firstRoleId)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load admins, roles, and permissions.')
      setAdmins([])
      setRoles([])
      setAdminRoles({})
      setPermissions(EMPTY_PERMISSIONS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const selectedAdmin = admins.find((admin) => String(idOf(admin)) === String(selectedAdminId))
  const selectedRole = roles.find((role) => String(idOf(role)) === String(selectedRoleId))
  const permissionState = normalizePermissions(permissions, MODULES)
  const selectedCount = permissionCount(permissionState)
  const allSelected = selectedCount === MODULES.length * ACTIONS.length

  const adminRows = useMemo(() => admins.map((admin) => {
    const adminId = idOf(admin)
    const roleId = adminRoles[String(adminId)] || admin?.pharmacyPermissionRoleId || admin?.roleId || ''
    const role = roles.find((item) => String(idOf(item)) === String(roleId))
    return { id: adminId, name: nameOf(admin), email: admin?.email || '-', roleName: role ? nameOf(role) : 'Not assigned', roleId }
  }), [admins, adminRoles, roles])

  async function selectAdmin(adminId) {
    const roleId = adminRoles[String(adminId)] || ''
    setSelectedAdminId(adminId)
    setSelectedRoleId(roleId)
    setError('')
    setSuccess('')
    await loadRolePermissions(roleId)
  }

  async function chooseRole(roleId) {
    setSelectedRoleId(roleId)
    setError('')
    setSuccess('')
    await loadRolePermissions(roleId)
  }

  function togglePermission(module, action, checked) {
    setPermissions((current) => {
      const normalized = normalizePermissions(current, MODULES)
      return { ...normalized, [module]: { ...normalized[module], [action]: checked } }
    })
    setSuccess('')
    setError('')
  }

  function toggleAllPermissions() {
    const checked = !allSelected
    setPermissions(Object.fromEntries(MODULES.map((module) => [module, Object.fromEntries(ACTIONS.map((action) => [action, checked]))])))
    setSuccess('')
    setError('')
  }

  function isColumnSelected(action) {
    return MODULES.every((module) => Boolean(permissionState[module]?.[action]))
  }

  function toggleColumnPermission(action, checked) {
    setPermissions((current) => {
      const normalized = normalizePermissions(current, MODULES)
      return Object.fromEntries(MODULES.map((module) => [module, { ...normalized[module], [action]: checked }]))
    })
    setSuccess('')
    setError('')
  }

  async function savePermissions(event) {
    event.preventDefault()
    if (!selectedAdminId || !selectedRoleId) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await assignPharmacyAdminRole(selectedAdminId, { roleId: selectedRoleId })
      await updateSuperAdminRolePermissions(selectedRoleId, permissionPayload(permissions))
      const localSavedPermissions = normalizePermissions(permissions, MODULES)
      setPermissions(localSavedPermissions)
      const refreshed = await getSuperAdminRolePermissions(selectedRoleId).catch(() => null)
      const refreshedPermissions = normalizePermissions(permissionSource(refreshed, localSavedPermissions), MODULES)
      setPermissions(hasAnyPermission(refreshedPermissions) ? refreshedPermissions : localSavedPermissions)
      setAdminRoles((current) => ({ ...current, [String(selectedAdminId)]: String(selectedRoleId) }))
      setSuccess('Admin permissions saved successfully.')
    } catch (requestError) {
      setError(/Invalid permission module/i.test(requestError.message || '') ? 'Backend rejected an old invalid permission module. Refresh this page and save again; only valid PMS modules are sent now.' : requestError.message || 'Unable to save admin permissions.')
    } finally {
      setSaving(false)
    }
  }

  return <div className={`super-admin-shell permissions-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
    <SuperAdminSidebar activeLabel="Roles & Permissions" />
    <main className="super-admin-main permissions-page">
      <SuperAdminTopbar onMenu={() => setSidebarOpen((value) => !value)} />
      <section className="permissions-heading"><div><h1>Roles &amp; Permissions</h1><p>Select an admin, assign a backend role, then save View, Create, Edit, and Delete permissions for PMS admin modules.</p></div></section>
      {error ? <p className="permissions-error">{error}</p> : null}
      {success ? <p className="permissions-success">{success}</p> : null}

      <section className="permissions-panel permissions-summary-panel">
        <div className="permissions-role-table permissions-admin-summary"><table><thead><tr><th>S.NO.</th><th>ROLE</th><th>MODULE</th><th>ASSIGNED USERS</th><th>PERMISSIONS</th></tr></thead><tbody>{loading ? <tr><td className="permissions-state" colSpan="5">Loading admins...</td></tr> : adminRows.length ? adminRows.map((admin, index) => <tr key={admin.id || index} className={String(admin.id) === String(selectedAdminId) ? 'is-selected' : ''} onClick={() => selectAdmin(admin.id)}><td>{index + 1}</td><td><div className="role-name-cell"><span className="role-mark"><Icon><path d="M12 3 5 6v5c0 4.2 2.8 8.1 7 10 4.2-1.9 7-5.8 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></Icon></span><span><strong>{admin.roleName}</strong><small className="role-badge">Assigned Role</small></span></div></td><td><strong>{MODULES.length} modules</strong><small>PMS admin sidebar modules</small></td><td><div className="permission-user-cell"><strong><Icon><circle cx="9" cy="8" r="4" /><path d="M3 21v-1a6 6 0 0 1 12 0v1" /><path d="M17 11a3 3 0 1 0 0-6" /><path d="M21 21v-1a5 5 0 0 0-3-4.6" /></Icon>1 admin</strong><small>{admin.name} - ID {admin.id || '0'}</small></div></td><td><div className="permission-tags">{String(admin.id) === String(selectedAdminId) ? (hasAnyPermission(permissionState) ? MODULES.map((module) => { const allowed = ACTIONS.filter((action) => permissionState[module]?.[action]).map(actionLabel); return allowed.length ? <span key={module}>{module}: {allowed.join(', ')}</span> : null }) : <span className="permission-none">No permissions assigned</span>) : <span className="permission-none">Select admin to view</span>}</div></td></tr>) : <tr><td className="permissions-state" colSpan="5">No admins found. Create admins first.</td></tr>}</tbody></table></div>
      </section>

      <section className="permissions-panel assign-panel"><header className="permissions-panel-header"><div><h2>Assign Permissions</h2><p>Admin sidebar module permissions for the selected Admin role.</p></div></header><form onSubmit={savePermissions}><label className="permissions-admin-select"><span>Admin Role / Admin ID</span><select value={selectedAdminId} onChange={(event) => selectAdmin(event.target.value)} disabled={loading || saving}><option value="">Select Admin</option>{admins.map((admin) => <option key={idOf(admin)} value={idOf(admin)}>{nameOf(admin)} - ID {idOf(admin) || '0'}</option>)}</select></label><label className="permissions-admin-select"><span>Backend Role</span><select value={selectedRoleId} onChange={(event) => chooseRole(event.target.value)} disabled={loading || saving}><option value="">Select Role</option>{roles.map((role) => <option key={idOf(role)} value={idOf(role)}>{nameOf(role)}</option>)}</select></label><div className="permissions-grid-wrap"><table className="permissions-grid"><thead><tr><th><span className="permissions-module-head"><span>Module</span><button className="permissions-select-all" type="button" onClick={toggleAllPermissions} disabled={!selectedAdminId || !selectedRoleId || loadingPermissions || saving}><Icon><path d="m5 12 4 4L19 6" /></Icon>{allSelected ? 'Deselect All' : 'Select All'}</button></span></th>{ACTIONS.map((action) => <th key={action}><label className="permissions-column-toggle"><input type="checkbox" checked={isColumnSelected(action)} disabled={!selectedAdminId || !selectedRoleId || loadingPermissions || saving} onChange={(event) => toggleColumnPermission(action, event.target.checked)} />{actionLabel(action)}</label></th>)}</tr></thead><tbody>{MODULES.map((module) => <tr key={module}><td><span className="module-label"><ModuleIcon module={module} /><span>{module}</span></span></td>{ACTIONS.map((action) => <td key={action}><label className={`permission-check permission-check-${action}`}><input type="checkbox" checked={Boolean(permissionState[module]?.[action])} disabled={!selectedAdminId || !selectedRoleId || loadingPermissions || saving} onChange={(event) => togglePermission(module, action, event.target.checked)} /><span><Icon><path d="m5 12 4 4L19 6" /></Icon></span>{actionLabel(action)}</label></td>)}</tr>)}</tbody></table></div><div className="permissions-save-row"><span>{selectedAdmin && selectedRole ? `${selectedCount} permissions selected for ${nameOf(selectedAdmin)} (${nameOf(selectedRole)})` : 'Select an admin and role'}</span><button className="permissions-primary" disabled={!selectedAdminId || !selectedRoleId || saving || loadingPermissions} type="submit">{saving ? 'Saving...' : 'Save Module Permissions'}</button></div></form></section>
    </main>
  </div>
}






