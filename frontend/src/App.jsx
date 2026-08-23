import React from 'react';
import { Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import OAuthCallbackPage from './pages/OAuthCallbackPage.jsx';
import GuidePage from './pages/GuidePage.jsx';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage.jsx';
import TermsPage from './pages/legal/TermsPage.jsx';
import RefundPolicyPage from './pages/legal/RefundPolicyPage.jsx';
import PaymentTermsPage from './pages/legal/PaymentTermsPage.jsx';
import TrustCentrePage from './pages/legal/TrustCentrePage.jsx';
import CookieSettingsPage from './pages/legal/CookieSettingsPage.jsx';
import DashboardLayout from './components/dashboard/DashboardLayout.jsx';
import OverviewPage from './pages/dashboard/OverviewPage.jsx';
import SecretsPage from './pages/dashboard/SecretsPage.jsx';
import ChannelsPage from './pages/dashboard/ChannelsPage.jsx';
import OrdersPage from './pages/dashboard/OrdersPage.jsx';
import ConversationsPage from './pages/dashboard/ConversationsPage.jsx';
import AdminClientsPage from './pages/dashboard/AdminClientsPage.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';
import CookieConsentBanner from './components/shared/CookieConsentBanner.jsx';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/payment-terms" element={<PaymentTermsPage />} />
        <Route path="/trust-centre" element={<TrustCentrePage />} />
        <Route path="/cookie-settings" element={<CookieSettingsPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="conversations" element={<ConversationsPage />} />
          <Route path="secrets" element={<SecretsPage />} />
          <Route path="channels" element={<ChannelsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="admin/clients" element={<AdminClientsPage />} />
        </Route>
      </Routes>

      <CookieConsentBanner />
    </>
  );
}
