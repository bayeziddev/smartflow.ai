import React from 'react';
import { Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import OAuthCallbackPage from './pages/OAuthCallbackPage.jsx';
import DashboardLayout from './components/dashboard/DashboardLayout.jsx';
import OverviewPage from './pages/dashboard/OverviewPage.jsx';
import SecretsPage from './pages/dashboard/SecretsPage.jsx';
import ChannelsPage from './pages/dashboard/ChannelsPage.jsx';
import OrdersPage from './pages/dashboard/OrdersPage.jsx';
import ConversationsPage from './pages/dashboard/ConversationsPage.jsx';
import AdminClientsPage from './pages/dashboard/AdminClientsPage.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />

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
  );
}
