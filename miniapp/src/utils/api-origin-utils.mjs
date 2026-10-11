export function normalizeApiOrigin(origin = '') {
  return String(origin).trim().replace(/\/+$/, '');
}

export function resolveMiniappApiOrigin({
  injectedOrigin = '',
  runtimeOrigin = '',
  fallbackOrigin = 'http://127.0.0.1:3000',
} = {}) {
  return (
    normalizeApiOrigin(runtimeOrigin)
    || normalizeApiOrigin(injectedOrigin)
    || normalizeApiOrigin(fallbackOrigin)
  );
}
