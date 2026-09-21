import SidebarIcon from '../../components/SidebarIcon'

const item = (label, path, iconName, color) => ({
  label,
  path,
  icon: <SidebarIcon name={iconName} />,
  iconName,
  color,
})

export const adminNavigation = [
  item('Dashboard', '/admin/dashboard', 'dashboard', 'blue'),
  item('Users', '/admin/users', 'users', 'orange'),
  item('Medicines', '/admin/medicines', 'medicines', 'emerald'),
  item('Stock', '/admin/stock', 'package', 'teal'),
  item('Suppliers', '/admin/suppliers', 'truck', 'amber'),
  item('Purchase Orders', '/admin/purchase-orders', 'shoppingCart', 'blue'),
  item('Stock Transfers', '/admin/stock-transfers', 'arrowLeftRight', 'cyan'),
  item('Prescriptions', '/admin/prescriptions', 'fileText', 'purple'),
  item('Dispensing', '/admin/dispensing', 'clipboardCheck', 'rose'),
  item('Expiry Alerts', '/admin/expiry-alerts', 'triangleAlert', 'red'),
  item('Reports', '/admin/reports', 'barChart3', 'purple'),
  item('Settings', '/admin/settings', 'cog', 'cyan'),
  item('CMS Integration', '/admin/cms-integration', 'globe', 'blue'),
]
