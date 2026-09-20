import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Welcome } from './screens/Welcome/Welcome.jsx';
import { Login } from './screens/Auth/Login.jsx';
import { Signup } from './screens/Auth/Signup.jsx';
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
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
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
