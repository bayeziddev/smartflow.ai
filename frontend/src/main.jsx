import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CookieConsentProvider } from './context/CookieConsentContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BASE_URL tracks vite.config.js's `base` — "/" locally, "/smartflow.ai/"
        on GitHub Pages — so routes resolve correctly under either. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <CookieConsentProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CookieConsentProvider>
    </BrowserRouter>
  </React.StrictMode>
);
