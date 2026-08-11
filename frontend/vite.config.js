import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves project sites (not user/org sites) from a
// /<repo-name>/ subpath, so every asset URL Vite emits needs that
// prefix. Only applied for production builds — local dev still runs
// at the root so `npm run dev` URLs don't change.
const isGithubPagesBuild = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGithubPagesBuild ? '/smartflow.ai/' : '/',
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
