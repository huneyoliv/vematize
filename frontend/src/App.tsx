import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider } from './hooks/useLanguage';
import Sidebar from './components/layout/Sidebar';
import PageShell from './components/layout/PageShell';
import LoginPage from './components/pages/LoginPage';
import DashboardPage from './components/pages/DashboardPage';
import ProductsPage from './components/pages/ProductsPage';
import UsersPage from './components/pages/UsersPage';
import SalesPage from './components/pages/SalesPage';
import CouponsPage from './components/pages/CouponsPage';
import BotsListPage from './components/pages/BotsListPage';
import BotsPage from './components/pages/BotsPage';
import SettingsPage from './components/pages/SettingsPage';
import CampaignPage from './components/pages/CampaignPage';
import GalleryPage from './components/pages/GalleryPage';
import LandingPage from './components/pages/LandingPage';
import PreviewBanner from './components/ui/PreviewBanner';

const IS_PREVIEW = import.meta.env.VITE_PREVIEW_MODE === 'true';
const APP_PREFIX = IS_PREVIEW ? '/app' : '';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" aria-hidden />
        <span>Carregando...</span>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to={`${APP_PREFIX}/login`} replace />;
  return (
    <>
      <Sidebar />
      <main className="content" style={{ position: 'relative' }}>
        <PageShell>{children}</PageShell>
      </main>
      {IS_PREVIEW && <PreviewBanner />}
    </>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" aria-hidden />
        <span>Carregando...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={IS_PREVIEW ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
      <Route path={`${APP_PREFIX}/login`} element={isAuthenticated ? <Navigate to={`${APP_PREFIX}/dashboard`} replace /> : <LoginPage />} />
      <Route path={`${APP_PREFIX}/dashboard`} element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/products`} element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/users`} element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/sales`} element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/coupons`} element={<ProtectedRoute><CouponsPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/bots`} element={<ProtectedRoute><BotsListPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/bots/:platform`} element={<ProtectedRoute><BotsPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/settings`} element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/campanhas`} element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />
      <Route path={`${APP_PREFIX}/gallery`} element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={IS_PREVIEW ? '/' : '/dashboard'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
