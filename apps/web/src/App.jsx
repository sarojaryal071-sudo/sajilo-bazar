import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { ScrollToTop } from './components/ScrollToTop.jsx';
import { IncomingRequestPopup } from './components/IncomingRequestPopup.jsx';
import { AppShell } from './components/AppShell.jsx';
import { AdminShell } from './components/AdminShell.jsx';
import { Landing } from './screens/Landing/Landing.jsx';
import { Terms } from './screens/Legal/Terms.jsx';
import { Privacy } from './screens/Legal/Privacy.jsx';
import { Login } from './screens/Auth/Login.jsx';
import { ForgotPassword } from './screens/Auth/ForgotPassword.jsx';
import { Signup } from './screens/Auth/Signup.jsx';
import { Home } from './screens/Home/Home.jsx';
import { Bookings } from './screens/Bookings/Bookings.jsx';
import { Profile } from './screens/Profile/Profile.jsx';
import { Settings } from './screens/Settings/Settings.jsx';
import { WorkerDetail } from './screens/WorkerDetail/WorkerDetail.jsx';
import { WorkerApply } from './screens/WorkerApply/WorkerApply.jsx';
import { WorkerDashboard } from './screens/WorkerDashboard/WorkerDashboard.jsx';
import { WorkerJobs } from './screens/WorkerJobs/WorkerJobs.jsx';
import { WorkerAvailability } from './screens/WorkerAvailability/WorkerAvailability.jsx';
import { BookingRequest } from './screens/BookingRequest/BookingRequest.jsx';
import { BookingDetail } from './screens/BookingDetail/BookingDetail.jsx';
import { BookingChat } from './screens/BookingChat/BookingChat.jsx';
import { InstantRequest } from './screens/InstantRequest/InstantRequest.jsx';
import { Notifications } from './screens/Notifications/Notifications.jsx';
import { Earnings } from './screens/Earnings/Earnings.jsx';
import { HelpSupport } from './screens/HelpSupport/HelpSupport.jsx';
import { AdminDashboard } from './screens/Admin/AdminDashboard.jsx';
import { AdminApprovals } from './screens/Admin/AdminApprovals.jsx';
import { AdminUsers } from './screens/Admin/AdminUsers.jsx';
import { AdminUserDetail } from './screens/Admin/AdminUserDetail.jsx';
import { AdminBookings } from './screens/Admin/AdminBookings.jsx';
import { AdminBookingDetail } from './screens/Admin/AdminBookingDetail.jsx';
import { AdminCategories } from './screens/Admin/AdminCategories.jsx';
import { AdminDisputes } from './screens/Admin/AdminDisputes.jsx';
import { AdminDisputeDetail } from './screens/Admin/AdminDisputeDetail.jsx';
import { AdminSupportTickets } from './screens/Admin/AdminSupportTickets.jsx';
import { AdminStaff } from './screens/Admin/AdminStaff.jsx';
import { AdminPublications } from './screens/Admin/AdminPublications.jsx';
import { AdminPolicies } from './screens/Admin/AdminPolicies.jsx';
import { AdminComingSoon } from './screens/Admin/AdminComingSoon.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SocketProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              <Route element={<AppShell />}>
                <Route path="/home" element={<Home />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/worker/dashboard" element={<WorkerDashboard />} />
                <Route path="/worker/jobs" element={<WorkerJobs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<HelpSupport />} />
          </Route>

          <Route element={<AdminShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:id" element={<AdminUserDetail />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/bookings/:id" element={<AdminBookingDetail />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/staff" element={<AdminStaff />} />
            <Route path="/admin/analytics" element={<AdminComingSoon title="Analytics" />} />
            <Route path="/admin/live-ops" element={<AdminComingSoon title="Live Ops" />} />
            <Route path="/admin/accounting" element={<AdminComingSoon title="Accounting" />} />
            <Route path="/admin/disputes" element={<AdminDisputes />} />
            <Route path="/admin/disputes/:id" element={<AdminDisputeDetail />} />
            <Route path="/admin/support" element={<AdminSupportTickets />} />
            <Route path="/admin/support/:id" element={<AdminSupportTickets />} />
            <Route path="/admin/publications" element={<AdminPublications />} />
            <Route path="/admin/policies" element={<AdminPolicies />} />
            <Route path="/admin/settings" element={<AdminComingSoon title="Settings" />} />
          </Route>

          <Route
            path="/worker/:id"
            element={
              <ProtectedRoute>
                <WorkerDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/apply"
            element={
              <ProtectedRoute role="worker">
                <WorkerApply />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book/:workerId/:serviceIds"
            element={
              <ProtectedRoute role="customer">
                <BookingRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instant/new"
            element={
              <ProtectedRoute role="customer">
                <InstantRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/:id"
            element={
              <ProtectedRoute>
                <BookingDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/:id/chat"
            element={
              <ProtectedRoute>
                <BookingChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/earnings"
            element={
              <ProtectedRoute role="worker">
                <Earnings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/availability"
            element={
              <ProtectedRoute role="worker">
                <WorkerAvailability />
              </ProtectedRoute>
            }
          />
        </Routes>

            {/* Mounted outside Routes so it persists across navigation - a
                worker should see an incoming instant request regardless of
                which screen they're currently on. */}
            <IncomingRequestPopup />
          </SocketProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
