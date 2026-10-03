import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is served from the root of its custom domain
// (https://chatbot.sayadbayezid.com/ — see public/CNAME), so `base` stays
// "/". It must be a path, never a full URL: React Router uses it as the
// router basename (main.jsx), and a URL there matches no path at all,
// which renders a blank page. Set VITE_BASE=/smartflow.ai/ only if the
// site is ever served from bayeziddev.github.io/smartflow.ai/ without the
// custom domain.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
