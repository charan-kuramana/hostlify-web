import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './guards/AuthGuard'
import RoleGuard from './guards/RoleGuard'
import Unauthorized from './pages/Unauthorized'
import { ToastContainer } from './components/ui/Toast'

// Auth pages (eager — tiny, always needed)
import HostellerLogin from './pages/auth/HostellerLogin'
import HostellerSignup from './pages/auth/HostellerSignup'
import StaffLogin from './pages/auth/StaffLogin'
import SuperAdminLogin from './pages/auth/SuperAdminLogin'
import ForgotPassword from './pages/auth/ForgotPassword'

// Layouts (lazy)
const AppLayout = lazy(() => import('./layouts/AppLayout'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout'))

// Hosteller pages
const AppDashboard = lazy(() => import('./pages/app/Dashboard'))
const MyDues = lazy(() => import('./pages/app/MyDues'))
const MyDocuments = lazy(() => import('./pages/app/MyDocuments'))
const MyProfile = lazy(() => import('./pages/app/MyProfile'))
const AppComplaints = lazy(() => import('./pages/app/Complaints'))
const AppMenu = lazy(() => import('./pages/app/Menu'))
const AppLeave = lazy(() => import('./pages/app/Leave'))
const AppService = lazy(() => import('./pages/app/Service'))
const AppReferral = lazy(() => import('./pages/app/Referral'))
const AppAnnouncements = lazy(() => import('./pages/app/Announcements'))
const AppParking = lazy(() => import('./pages/app/Parking'))
const AppCleaning = lazy(() => import('./pages/app/Cleaning'))
const HostelDiscovery = lazy(() => import('./pages/app/HostelDiscovery'))
const HostelDetail = lazy(() => import('./pages/app/HostelDetail'))
const BedSelectionWizard = lazy(() => import('./pages/app/BedSelectionWizard'))
const BookingStatus = lazy(() => import('./pages/app/BookingStatus'))

// Staff pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const Allocations = lazy(() => import('./pages/admin/Allocations'))
const Members = lazy(() => import('./pages/admin/Members'))
const Payments = lazy(() => import('./pages/admin/Payments'))
const AdminComplaints = lazy(() => import('./pages/admin/Complaints'))
const Expenses = lazy(() => import('./pages/admin/Expenses'))
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'))
const AdminMenu = lazy(() => import('./pages/admin/Menu'))
const AdminLeave = lazy(() => import('./pages/admin/Leave'))
const OccupancyMap = lazy(() => import('./pages/admin/OccupancyMap'))
const Parking = lazy(() => import('./pages/admin/Parking'))
const Cleaning = lazy(() => import('./pages/admin/Cleaning'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const HostelSetup = lazy(() => import('./pages/admin/HostelSetup'))
const StaffManagement = lazy(() => import('./pages/admin/StaffManagement'))
const RevenueReport = lazy(() => import('./pages/admin/RevenueReport'))
const Reviews = lazy(() => import('./pages/admin/Reviews'))
const Account = lazy(() => import('./pages/admin/Account'))
const MemberDetail = lazy(() => import('./pages/admin/MemberDetail'))
const Maintenance = lazy(() => import('./pages/admin/Maintenance'))
const Enquiries = lazy(() => import('./pages/admin/Enquiries'))

// Public listing pages (no login)
const PublicHostels = lazy(() => import('./pages/public/PublicHostels'))
const PublicHostelDetail = lazy(() => import('./pages/public/PublicHostelDetail'))

// Super Admin pages
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/Dashboard'))
const Owners = lazy(() => import('./pages/super-admin/Owners'))
const OwnerDetail = lazy(() => import('./pages/super-admin/OwnerDetail'))
const CreateOwner = lazy(() => import('./pages/super-admin/CreateOwner'))
const SARevenue = lazy(() => import('./pages/super-admin/Revenue'))
const SAOccupancy = lazy(() => import('./pages/super-admin/Occupancy'))
const SAComplaints = lazy(() => import('./pages/super-admin/Complaints'))
const SAAccount = lazy(() => import('./pages/super-admin/Account'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/auth/login" element={<HostellerLogin />} />
          <Route path="/auth/signup" element={<HostellerSignup />} />
          <Route path="/auth/staff/login" element={<StaffLogin />} />
          <Route path="/auth/super-admin/login" element={<SuperAdminLogin />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/hostels" element={<PublicHostels />} />
          <Route path="/hostels/:slug" element={<PublicHostelDetail />} />

          {/* ── Hosteller Portal (/app/*) ── */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['HOSTELLER']} />}>
              <Route element={<AppLayout />}>
                <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/app/dashboard" element={<AppDashboard />} />
                <Route path="/app/dues" element={<MyDues />} />
                <Route path="/app/documents" element={<MyDocuments />} />
                <Route path="/app/profile" element={<MyProfile />} />
                <Route path="/app/complaints" element={<AppComplaints />} />
                <Route path="/app/menu" element={<AppMenu />} />
                <Route path="/app/leave" element={<AppLeave />} />
                <Route path="/app/service" element={<AppService />} />
                <Route path="/app/referral" element={<AppReferral />} />
                <Route path="/app/announcements" element={<AppAnnouncements />} />
                <Route path="/app/parking" element={<AppParking />} />
                <Route path="/app/cleaning" element={<AppCleaning />} />
                <Route path="/app/discover" element={<HostelDiscovery />} />
                <Route path="/app/hostel/:hostelId" element={<HostelDetail />} />
                <Route path="/app/hostel/:hostelId/book" element={<BedSelectionWizard />} />
                <Route path="/app/booking-status" element={<BookingStatus />} />
              </Route>
            </Route>
          </Route>

          {/* ── Staff Portal (/admin/*) ── */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['HOSTEL_STAFF']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/allocations" element={<Allocations />} />
                <Route path="/admin/members" element={<Members />} />
                <Route path="/admin/payments" element={<Payments />} />
                <Route path="/admin/complaints" element={<AdminComplaints />} />
                <Route path="/admin/expenses" element={<Expenses />} />
                <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                <Route path="/admin/menu" element={<AdminMenu />} />
                <Route path="/admin/leave" element={<AdminLeave />} />
                <Route path="/admin/occupancy" element={<OccupancyMap />} />
                <Route path="/admin/parking" element={<Parking />} />
                <Route path="/admin/cleaning" element={<Cleaning />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/hostel-setup" element={<HostelSetup />} />
                <Route path="/admin/staff" element={<StaffManagement />} />
                <Route path="/admin/revenue" element={<RevenueReport />} />
                <Route path="/admin/reviews" element={<Reviews />} />
                <Route path="/admin/account" element={<Account />} />
                <Route path="/admin/members/:id" element={<MemberDetail />} />
                <Route path="/admin/maintenance" element={<Maintenance />} />
                <Route path="/admin/enquiries" element={<Enquiries />} />
                <Route path="/admin/employees" element={<Navigate to="/admin/staff" replace />} />
                {/* /admin/booking-requests merged into /admin/allocations */}
              </Route>
            </Route>
          </Route>

          {/* ── Super Admin Portal (/super-admin/*) ── */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['SUPER_ADMIN']} />}>
              <Route element={<SuperAdminLayout />}>
                <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/owners" element={<Owners />} />
                <Route path="/super-admin/owners/create" element={<CreateOwner />} />
                <Route path="/super-admin/owners/:id" element={<OwnerDetail />} />
                <Route path="/super-admin/revenue" element={<SARevenue />} />
                <Route path="/super-admin/occupancy" element={<SAOccupancy />} />
                <Route path="/super-admin/complaints" element={<SAComplaints />} />
                <Route path="/super-admin/account" element={<SAAccount />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
