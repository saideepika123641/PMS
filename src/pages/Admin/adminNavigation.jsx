import SidebarIcon from '../../components/SidebarIcon'

const item = (label, path, iconName, color) => ({
  label,
  path,
  icon: <SidebarIcon name={iconName} />,
  color,
})

export const adminNavigation = [
  item('Dashboard', '/admin/dashboard', 'dashboard', '#0878e8'),
  item('Users', '/admin/users', 'users', '#7c3aed'),
  item('Medicines', '/admin/medicines', 'medicines', '#06b6d4'),
  item('Stock', '/admin/stock', 'package', '#ec4899'),
  item('Suppliers', '/admin/suppliers', 'truck', '#f97316'),
  item('Purchase Orders', '/admin/purchase-orders', 'shoppingCart', '#10b981'),
  item('Stock Transfers', '/admin/stock-transfers', 'arrowLeftRight', '#2563eb'),
  item('Prescriptions', '/admin/prescriptions', 'fileText', '#8b5cf6'),
  item('Dispensing', '/admin/dispensing', 'clipboardCheck', '#14b8a6'),
  item('Expiry Alerts', '/admin/expiry-alerts', 'triangleAlert', '#ef4444'),
  item('Reports', '/admin/reports', 'barChart3', '#f59e0b'),
  item('Settings', '/admin/settings', 'cog', '#10b981'),
  item('CMS Integration', '/admin/cms-integration', 'globe', '#06b6d4'),
]
