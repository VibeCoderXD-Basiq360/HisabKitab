import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Express runs on PORT from Backend/.env. Passing /api through makes the
    // browser see one site, so the SameSite session cookie is sent.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
