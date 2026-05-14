import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import EventListPage from './pages/EventListPage';
import EventDetailPage from './pages/EventDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ManagerDashboard from './pages/ManagerDashboard';
import GuestDashboard from './pages/GuestDashboard';
import NotificationsPage from './pages/NotificationsPage';

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'club_manager' ? '/manager' : '/guest'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<EventListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/manager" element={
          <PrivateRoute role="club_manager"><ManagerDashboard /></PrivateRoute>
        } />
        <Route path="/guest" element={
          <PrivateRoute role="guest"><GuestDashboard /></PrivateRoute>
        } />
        <Route path="/notifications" element={
          <PrivateRoute role="guest"><NotificationsPage /></PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
