import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = 'http://localhost:8794';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'sse-proxy',
      configureServer(server) {
        server.middlewares.use('/api/chat', async (req, res, next) => {
          if (req.method !== 'POST') return next();

          const token = req.headers.authorization;
          let body = '';
          for await (const chunk of req) body += chunk;

          const upstream = await fetch(`${BACKEND}${req.url}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: token } : {}),
            },
            body,
          });

          const contentType = upstream.headers.get('content-type') || '';
          const headers = Object.fromEntries(upstream.headers);
          delete headers['transfer-encoding'];
          delete headers['content-encoding'];
          res.writeHead(upstream.status, headers);

          if (contentType.includes('text/event-stream')) {
            const reader = upstream.body.getReader();
            req.on('close', () => reader.cancel());
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!res.destroyed) res.write(value);
              }
            } catch { /* client disconnected */ }
            res.end();
          } else {
            const data = await upstream.text();
            res.end(data);
          }
        });
      }
    }
  ],
  server: {
    port: 8081,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 8081,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
