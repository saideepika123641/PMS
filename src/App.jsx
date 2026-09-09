import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import PmsLanding from './pages/PmsLanding'
import ResetPassword from './pages/ResetPassword'
import VerifyOTP from './pages/VerifyOTP'
import SuperAdminDashboard from './pages/Super Admin/SuperAdminDashboard'
import UsersPermissions from './pages/Super Admin/UsersPermissions'
import Medicines from './pages/Super Admin/Medicines'
import SystemSettings from './pages/Super Admin/SystemSettings'
import Reports from './pages/Super Admin/Reports'
import ActivityLogs from './pages/Super Admin/Audit Logs'
import Notifications from './pages/Super Admin/Notifications'
import Admins from './pages/Super Admin/Admins'
import Clinics from './pages/Super Admin/Clinics'
import Branches from './pages/Super Admin/Branches'
import SuperAdminProfile from './pages/Super Admin/SuperAdminProfile'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminUsers from './pages/Admin/Users'
import AdminMedicines from './pages/Admin/Medicines'
import AdminStock from './pages/Admin/Stock'
import AdminPrescriptions from './pages/Admin/Prescriptions'
import AdminDispensing from './pages/Admin/Dispensing'
import AdminExpiryAlerts from './pages/Admin/ExpiryAlerts'
import AdminReports from './pages/Admin/Reports'
import AdminSettings from './pages/Admin/Settings'
import AdminSuppliers from './pages/Admin/Suppliers'
import AdminPurchaseOrders from './pages/Admin/PurchaseOrders'
import AdminCmsIntegration from './pages/Admin/CmsIntegration'
import AdminStockTransfers from './pages/Admin/StockTransfers'
import PharmacistDashboard from './pages/Pharmacist/Dashboard'
import PharmacistPending from './pages/Pharmacist/Pending'
import PharmacistDispensing from './pages/Pharmacist/Dispensing'
import PharmacistBills from './pages/Pharmacist/Bills'
import PharmacistReturns from './pages/Pharmacist/Returns'
import PharmacistReports from './pages/Pharmacist/Reports'
import ToastProvider from './components/ToastProvider'
import FormValidationGuard from './components/FormValidationGuard'
import './App.css'

function App() {
  return (
    <ToastProvider>
      <FormValidationGuard />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PmsLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/admins" element={<Admins />} />
          <Route path="/super-admin/clinics/add" element={<Clinics />} />
          <Route path="/super-admin/clinics" element={<Clinics />} />
          <Route path="/super-admin/branches" element={<Branches />} />
          <Route path="/super-admin/users-permissions" element={<UsersPermissions />} />
          <Route path="/super-admin/medicines" element={<Medicines />} />
          <Route path="/super-admin/system-settings" element={<SystemSettings />} />
          <Route path="/superadmin/settings" element={<SystemSettings />} />
          <Route path="/super-admin/reports" element={<Reports />} />
          <Route path="/super-admin/audit-logs" element={<ActivityLogs />} />
          <Route path="/super-admin/activity-logs" element={<Navigate to="/super-admin/audit-logs" replace />} />
          <Route path="/super-admin/notifications" element={<Notifications />} />
          <Route path="/profile" element={<SuperAdminProfile initialTab="profile" />} />
          <Route path="/change-password" element={<SuperAdminProfile initialTab="password" />} />
          <Route path="/super-admin/profile" element={<SuperAdminProfile initialTab="profile" />} />
          <Route path="/super-admin/change-password" element={<SuperAdminProfile initialTab="password" />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/medicines" element={<AdminMedicines />} />
          <Route path="/admin/stock" element={<AdminStock />} />
          <Route path="/inventory" element={<AdminStock initialView="inventory" />} />
          <Route path="/low-stock" element={<AdminStock initialView="low" />} />
          <Route path="/near-expiry" element={<AdminStock initialView="near" />} />
          <Route path="/out-of-stock" element={<AdminStock initialView="out" />} />
          <Route path="/stock-summary" element={<AdminStock initialView="summary" />} />
          <Route path="/transactions" element={<AdminStock initialView="transactions" />} />
          <Route path="/valuation" element={<AdminStock initialView="valuation" />} />
          <Route path="/expired" element={<AdminStock initialView="expired" />} />
          <Route path="/admin/suppliers" element={<AdminSuppliers />} />
          <Route path="/admin/purchase-orders" element={<AdminPurchaseOrders />} />
          <Route path="/admin/stock-transfers" element={<AdminStockTransfers />} />
          <Route path="/admin/prescriptions" element={<AdminPrescriptions />} />
          <Route path="/admin/dispensing" element={<AdminDispensing />} />
          <Route path="/admin/expiry-alerts" element={<AdminExpiryAlerts />} />
          <Route path="/admin/cms-integration" element={<AdminCmsIntegration />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/profile" element={<SuperAdminProfile initialTab="profile" roleType="pharmacy-admin" />} />
          <Route path="/admin/change-password" element={<SuperAdminProfile initialTab="password" roleType="pharmacy-admin" />} />
          <Route path="/pharmacist/dashboard" element={<PharmacistDashboard />} />
          <Route path="/pharmacist/pending" element={<PharmacistPending />} />
          <Route path="/pharmacist/dispensing" element={<PharmacistDispensing />} />
          <Route path="/pharmacist/bills" element={<PharmacistBills />} />
          <Route path="/pharmacist/returns" element={<PharmacistReturns />} />
          <Route path="/pharmacist/reports" element={<PharmacistReports />} />
          <Route path="/pharmacist/profile" element={<SuperAdminProfile initialTab="profile" roleType="pharmacist" />} />
          <Route path="/pharmacist/change-password" element={<SuperAdminProfile initialTab="password" roleType="pharmacist" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
