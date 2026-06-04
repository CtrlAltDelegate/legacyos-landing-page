import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { tokenStore } from '@/api/client';

import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Spinner from '@/components/Spinner';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Onboarding from '@/pages/Onboarding';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import Dashboard from '@/pages/Dashboard';
import Assets from '@/pages/Assets';
import Documents from '@/pages/Documents';
import Flo from '@/pages/Flo';
import WingDetail from '@/pages/WingDetail';
import Admin from '@/pages/Admin';
import Profile from '@/pages/Profile';
import Liabilities from '@/pages/Liabilities';
import ExportReport from '@/pages/ExportReport';
import TwoFactorSetup from '@/pages/TwoFactorSetup';
import Landing from '@/pages/Landing';
import Analytics from '@/pages/Analytics';
import Portfolio from '@/pages/Portfolio';

export default function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Protected — requires auth + onboarding complete */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/wings/:wing" element={<WingDetail />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/liabilities" element={<Liabilities />} />
            <Route path="/export" element={<ExportReport />} />
            <Route path="/security/2fa" element={<TwoFactorSetup />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/flo" element={<Flo />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Root: landing for guests, dashboard for logged-in users */}
        <Route path="/" element={tokenStore.getAccess() ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
