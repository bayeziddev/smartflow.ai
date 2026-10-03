import axios from 'axios';

// In dev, Vite proxies /api to the backend (see vite.config.js). In
// production, if the frontend is deployed on a different host than
// the backend, set VITE_API_BASE_URL (e.g. https://api.yourapp.com/api).
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fanchatbot_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fanchatbot_token');
      if (window.location.pathname.startsWith('/dashboard')) {
        window.location.href = `${import.meta.env.BASE_URL}login`;
      }
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const registerTenant = (payload) => api.post('/auth/register', payload).then((r) => r.data);
export const loginTenant = (payload) => api.post('/auth/login', payload).then((r) => r.data);
export const fetchMe = () => api.get('/auth/me').then((r) => r.data);
export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data);

// ---- Automation (auto replies) ----
export const fetchBotSettings = () => api.get('/automation/settings').then((r) => r.data);
export const saveBotSettings = (payload) => api.put('/automation/settings', payload).then((r) => r.data);
export const fetchRules = () => api.get('/automation/rules').then((r) => r.data);
export const createRule = (payload) => api.post('/automation/rules', payload).then((r) => r.data);
export const updateRule = (id, payload) => api.put(`/automation/rules/${id}`, payload).then((r) => r.data);
export const deleteRule = (id) => api.delete(`/automation/rules/${id}`).then((r) => r.data);
export const testBot = (text, sessionKey) => api.post('/automation/test', { text, sessionKey }).then((r) => r.data);

// ---- API key config (masked at every layer) ----
export const fetchKeys = () => api.get('/config/keys').then((r) => r.data);
export const saveKey = (provider, apiKey) => api.post('/config/keys', { provider, apiKey }).then((r) => r.data);
export const toggleKey = (provider, isActive) =>
  api.patch(`/config/keys/${provider}`, { isActive }).then((r) => r.data);
export const deleteKey = (provider) => api.delete(`/config/keys/${provider}`).then((r) => r.data);

// ---- Channels ----
export const fetchChannels = () => api.get('/channels').then((r) => r.data);
export const toggleChannel = (channel, enabled) =>
  api.post(`/channels/${channel}/toggle`, { enabled }).then((r) => r.data);
export const saveChannelCredentials = (channel, payload) =>
  api.post(`/channels/${channel}/credentials`, payload).then((r) => r.data);

// ---- WhatsApp QR (link a normal WhatsApp number through the gateway) ----
export const connectWhatsappQr = () => api.post('/channels/whatsapp_qr/connect').then((r) => r.data);
export const fetchWhatsappQrStatus = () => api.get('/channels/whatsapp_qr/status').then((r) => r.data);
export const logoutWhatsappQr = () => api.post('/channels/whatsapp_qr/logout').then((r) => r.data);

/**
 * Downloads a file from an authenticated endpoint. A plain <a href> can't
 * send the Authorization header, so fetch it as a blob and save that.
 */
async function downloadFile(path, fallbackName) {
  const res = await api.get(path, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const name = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || fallbackName;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Pulls the backend's error message out of an axios error. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.error?.message || err?.response?.data?.message || (err?.response ? fallback : 'Could not reach the server. Check your connection.');
}

// ---- Orders ----
export const fetchOrders = (params) => api.get('/orders', { params }).then((r) => r.data);
export const downloadOrdersCsv = () => downloadFile('/orders/export.csv', 'orders.csv');

// ---- Conversations ----
export const fetchConversations = () => api.get('/conversations').then((r) => r.data);
export const fetchConversationMessages = (sessionId) => api.get(`/conversations/${sessionId}/messages`).then((r) => r.data);

// ---- Admin (platform owner only) ----
export const fetchAllClients = () => api.get('/admin/clients').then((r) => r.data);
export const downloadClientsCsv = () => downloadFile('/admin/clients/export.csv', 'clients.csv');

// ---- Chat (test-a-key / widget) ----
export const sendChat = (payload) => api.post('/chat', payload).then((r) => r.data);

export default api;
