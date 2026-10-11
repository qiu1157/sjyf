import { resolveMiniappApiOrigin } from './api-origin-utils.mjs';

declare const __MINIAPP_API_ORIGIN__: string;

function getRuntimeApiOrigin() {
  const runtimeUni = (globalThis as { uni?: { getStorageSync?: (key: string) => string } }).uni;
  if (!runtimeUni?.getStorageSync) return '';
  return runtimeUni.getStorageSync('miniapp_api_origin') || '';
}

const MP_API_ORIGIN = resolveMiniappApiOrigin({
  injectedOrigin: __MINIAPP_API_ORIGIN__,
  runtimeOrigin: getRuntimeApiOrigin(),
  fallbackOrigin: 'http://127.0.0.1:3000',
});
const isH5 = typeof window !== 'undefined';

export const API_ORIGIN = isH5 ? '' : MP_API_ORIGIN;
export const API_BASE_URL = isH5 ? '/api' : `${MP_API_ORIGIN}/api`;

export function resolveAssetUrl(path = '') {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
