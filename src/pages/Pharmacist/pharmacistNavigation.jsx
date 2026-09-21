import SidebarIcon from '../../components/SidebarIcon'

const item = (label, path, iconName, color) => ({
  label,
  path,
  icon: <SidebarIcon name={iconName} />,
  iconName,
  color,
})

export const pharmacistNavigation = [
  item('Dashboard', '/pharmacist/dashboard', 'dashboard', 'blue'),
  item('Pending', '/pharmacist/pending', 'clock', 'purple'),
  item('Dispensing', '/pharmacist/dispensing', 'clipboardCheck', 'rose'),
  item('Bills', '/pharmacist/bills', 'receipt', 'amber'),
  item('Returns', '/pharmacist/returns', 'rotateCcw', 'cyan'),
  item('Reports', '/pharmacist/reports', 'barChart3', 'purple'),
]

