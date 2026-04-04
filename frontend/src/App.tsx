import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/layout/Sidebar';
import LoginPage from './components/pages/LoginPage';
import DashboardPage from './components/pages/DashboardPage';
import ProductsPage from './components/pages/ProductsPage';
import UsersPage from './components/pages/UsersPage';
import SalesPage from './components/pages/SalesPage';
import CouponsPage from './components/pages/CouponsPage';
import BotsListPage from './components/pages/BotsListPage';
import BotsPage from './components/pages/BotsPage';
import SettingsPage from './components/pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <>
      <Sidebar />
      <main className="content">{children}</main>
    </>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/coupons" element={<ProtectedRoute><CouponsPage /></ProtectedRoute>} />
      <Route path="/bots" element={<ProtectedRoute><BotsListPage /></ProtectedRoute>} />
      <Route path="/bots/:platform" element={<ProtectedRoute><BotsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
