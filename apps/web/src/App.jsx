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
import { WorkerApply } from './screens/WorkerApply/WorkerApply.jsx';
import { WorkerStatus } from './screens/WorkerApply/WorkerStatus.jsx';

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
        </Route>

        <Route
          path="/worker/apply"
          element={
            <ProtectedRoute role="worker">
              <WorkerApply />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/status"
          element={
            <ProtectedRoute role="worker">
              <WorkerStatus />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
