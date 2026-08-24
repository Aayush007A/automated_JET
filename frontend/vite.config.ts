import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Suppress benign socket reset on SSE client unmount
            if ((err as any).code === 'ECONNRESET') return;
            console.error('Proxy error:', err);
          });
        },
      },
    },
  },
});
