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
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const registerTenant = (payload) => api.post('/auth/register', payload).then((r) => r.data);
export const loginTenant = (payload) => api.post('/auth/login', payload).then((r) => r.data);

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
export const fetchWhatsappQr = () => api.get('/channels/whatsapp/qr').then((r) => r.data);
export const saveChannelCredentials = (channel, payload) =>
  api.post(`/channels/${channel}/credentials`, payload).then((r) => r.data);

// ---- Orders ----
export const fetchOrders = (params) => api.get('/orders', { params }).then((r) => r.data);
export const exportOrdersUrl = () => '/api/orders/export.xlsx';

// ---- Conversations ----
export const fetchConversations = () => api.get('/conversations').then((r) => r.data);
export const fetchConversationMessages = (sessionId) => api.get(`/conversations/${sessionId}/messages`).then((r) => r.data);

// ---- Admin (platform owner only) ----
export const fetchAllClients = () => api.get('/admin/clients').then((r) => r.data);
export const exportClientsUrl = () => '/api/admin/clients/export.csv';

// ---- Chat (test-a-key / widget) ----
export const sendChat = (payload) => api.post('/chat', payload).then((r) => r.data);

// ---- Leads (visitors who haven't registered yet — no auth) ----
export const submitLead = (email, source) => api.post('/leads', { email, source }).then((r) => r.data);

export default api;
