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
import { AdminDashboard } from './screens/Admin/AdminDashboard.jsx';
import { AdminApprovals } from './screens/Admin/AdminApprovals.jsx';

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
            <Route path="/help" element={<ComingSoon title="Help & Support" />} />
          </Route>

          <Route element={<AdminShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
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
