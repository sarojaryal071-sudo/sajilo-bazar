import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { IncomingRequestPopup } from './components/IncomingRequestPopup.jsx';
import { AppShell } from './components/AppShell.jsx';
import { AdminShell } from './components/AdminShell.jsx';
import { Welcome } from './screens/Welcome/Welcome.jsx';
import { Login } from './screens/Auth/Login.jsx';
import { Signup } from './screens/Auth/Signup.jsx';
import { Home } from './screens/Home/Home.jsx';
import { Bookings } from './screens/Bookings/Bookings.jsx';
import { Profile } from './screens/Profile/Profile.jsx';
import { WorkerDetail } from './screens/WorkerDetail/WorkerDetail.jsx';
import { WorkerApply } from './screens/WorkerApply/WorkerApply.jsx';
import { WorkerDashboard } from './screens/WorkerDashboard/WorkerDashboard.jsx';
import { WorkerJobs } from './screens/WorkerJobs/WorkerJobs.jsx';
import { BookingRequest } from './screens/BookingRequest/BookingRequest.jsx';
import { BookingDetail } from './screens/BookingDetail/BookingDetail.jsx';
import { BookingChat } from './screens/BookingChat/BookingChat.jsx';
import { InstantRequest } from './screens/InstantRequest/InstantRequest.jsx';
import { Notifications } from './screens/Notifications/Notifications.jsx';
import { Earnings } from './screens/Earnings/Earnings.jsx';
import { ComingSoon } from './screens/ComingSoon/ComingSoon.jsx';
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
import { AdminSupportTicketDetail } from './screens/Admin/AdminSupportTicketDetail.jsx';
import { AdminAnnouncements } from './screens/Admin/AdminAnnouncements.jsx';
import { AdminPolicies } from './screens/Admin/AdminPolicies.jsx';
import { AdminComingSoon } from './screens/Admin/AdminComingSoon.jsx';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<AppShell />}>
            <Route path="/home" element={<Home />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/worker/dashboard" element={<WorkerDashboard />} />
            <Route path="/worker/jobs" element={<WorkerJobs />} />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
            <Route path="/language" element={<ComingSoon title="Language" />} />
            <Route path="/theme" element={<ComingSoon title="Theme" />} />
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
            <Route path="/admin/staff" element={<AdminComingSoon title="Staff" />} />
            <Route path="/admin/analytics" element={<AdminComingSoon title="Analytics" />} />
            <Route path="/admin/live-ops" element={<AdminComingSoon title="Live Ops" />} />
            <Route path="/admin/accounting" element={<AdminComingSoon title="Accounting" />} />
            <Route path="/admin/disputes" element={<AdminDisputes />} />
            <Route path="/admin/disputes/:id" element={<AdminDisputeDetail />} />
            <Route path="/admin/support" element={<AdminSupportTickets />} />
            <Route path="/admin/support/:id" element={<AdminSupportTicketDetail />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
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
        </Routes>

        {/* Mounted outside Routes so it persists across navigation - a
            worker should see an incoming instant request regardless of
            which screen they're currently on. */}
        <IncomingRequestPopup />
      </SocketProvider>
    </AuthProvider>
  );
}
