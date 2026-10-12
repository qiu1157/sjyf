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

// 生产构建默认使用公网域名（微信小程序必须通过 HTTPS 域名访问后端）；
// 开发模式默认使用局域网地址，方便真机调试；
// 环境变量 MINIAPP_API_ORIGIN 始终拥有最高优先级，可覆盖上述两种场景
const isProd = process.env.NODE_ENV === 'production';
const miniappApiOrigin = process.env.MINIAPP_API_ORIGIN
  || (isProd ? 'https://sjyf.solo1157.xyz' : `http://${resolveLanHost()}:3000`);

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
