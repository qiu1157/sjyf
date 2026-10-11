import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import { networkInterfaces } from 'os';

function resolveLanHost() {
  const nets = networkInterfaces();
  for (const items of Object.values(nets)) {
    for (const item of items || []) {
      if (item.family === 'IPv4' && !item.internal && item.address) {
        return item.address;
      }
    }
  }
  return '127.0.0.1';
}

const miniappApiOrigin = process.env.MINIAPP_API_ORIGIN || `http://${resolveLanHost()}:3000`;

export default defineConfig({
  plugins: [uni()],
  define: {
    __MINIAPP_API_ORIGIN__: JSON.stringify(miniappApiOrigin),
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: miniappApiOrigin,
        changeOrigin: true,
      },
      '/uploads': {
        target: miniappApiOrigin,
        changeOrigin: true,
      },
    },
  },
});
