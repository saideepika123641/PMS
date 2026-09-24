import SidebarIcon from './SidebarIcon'

const item = (label, path, iconName, color) => ({
  label,
  path,
  icon: <SidebarIcon name={iconName} />,
  iconName,
  color,
})

export const superAdminNavigation = [
  item('Dashboard', '/super-admin/dashboard', 'dashboard', 'blue'),
  item('Pharmacies', '/super-admin/branches', 'branches', 'teal'),
  item('Medicines', '/super-admin/medicines', 'medicines', 'emerald'),
  item('Admins', '/super-admin/admins', 'admins', 'orange'),
  item('Roles & Permissions', '/super-admin/users-permissions', 'roles', 'amber'),
  item('Settings', '/super-admin/system-settings', 'settings', 'cyan'),
  item('Reports', '/super-admin/reports', 'reports', 'purple'),
  item('Audit Logs', '/super-admin/audit-logs', 'audit', 'green'),
  item('Notifications', '/super-admin/notifications', 'notifications', 'red'),
]


