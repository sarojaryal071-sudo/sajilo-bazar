import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AppShell } from './components/AppShell.jsx';
import { Welcome } from './screens/Welcome/Welcome.jsx';
import { Login } from './screens/Auth/Login.jsx';
import { Signup } from './screens/Auth/Signup.jsx';
import { Home } from './screens/Home/Home.jsx';
import { Search } from './screens/Search/Search.jsx';
import { Bookings } from './screens/Bookings/Bookings.jsx';
import { Profile } from './screens/Profile/Profile.jsx';
import { WorkerDetail } from './screens/WorkerDetail/WorkerDetail.jsx';
import { WorkerApply } from './screens/WorkerApply/WorkerApply.jsx';
import { WorkerDashboard } from './screens/WorkerDashboard/WorkerDashboard.jsx';
import { WorkerJobs } from './screens/WorkerJobs/WorkerJobs.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<AppShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/worker/dashboard" element={<WorkerDashboard />} />
          <Route path="/worker/jobs" element={<WorkerJobs />} />
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
      </Routes>
    </AuthProvider>
  );
}
