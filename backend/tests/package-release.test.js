// Task 6 专用 TR 验证：验证三份 zip 的结构、大小、排除规则
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist-release');
const TMP = path.join(DIST, 'unzip-check');

let FAIL = 0;
function check(label, cond, extra) {
  const tag = cond ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${label}${extra ? '  => ' + extra : ''}`);
  if (!cond) FAIL++;
}

const targets = [
  { zip: 'backend-runtime.zip', minKB: 100 },
  { zip: 'admin-dist.zip', minKB: 100 },
  { zip: 'miniapp-h5.zip', minKB: 100 },
];

// ---------- TR 1：三份 zip 均存在且 > 最低大小 ----------
console.log('=== TR 1：zip 文件存在且大小合格 ===');
for (const t of targets) {
  const p = path.join(DIST, t.zip);
  const exists = fs.existsSync(p);
  let sizeKB = -1;
  if (exists) sizeKB = fs.statSync(p).size / 1024;
  check(`${t.zip} 存在且 ≥ ${t.minKB} KB`, exists && sizeKB >= t.minKB,
    exists ? `${sizeKB.toFixed(1)} KB` : '文件不存在');
}

// 清理解包目录
if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

// ---------- 解包每份 zip ----------
const zipEntries = {};
for (const t of targets) {
  const p = path.join(DIST, t.zip);
  const outdir = path.join(TMP, t.zip.replace('.zip', ''));
  fs.mkdirSync(outdir, { recursive: true });
  try {
    // Node 22 原生支持 tar/unzip，这里用 PowerShell Expand-Archive 更稳定
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${p}' -DestinationPath '${outdir}' -Force"`,
      { stdio: 'pipe', encoding: 'utf8' },
    );
  } catch (e) {
    console.error('  [FATAL] 解包失败:', t.zip, e.stderr || e.message);
    process.exit(1);
  }
  // 收集所有文件条目
  const entries = [];
  (function walk(dir) {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const d of list) {
      const full = path.join(dir, d.name);
      const rel = path.relative(outdir, full).split(path.sep).join('/');
      if (d.isDirectory()) walk(full);
      else entries.push(rel);
    }
  })(outdir);
  zipEntries[t.zip] = { dir: outdir, entries };
}

// ---------- TR 2：backend-runtime 严格排除敏感/无用项 ----------
console.log('\n=== TR 2：backend-runtime 排除规则（敏感项未进入包） ===');
const be = zipEntries['backend-runtime.zip'].entries;
const badBackendEntries = be.filter((e) => {
  const lower = e.toLowerCase();
  // tasks.md 明确要求排除：
  //   node_modules / 真实 .env* (除 .example) / cert / *.key / *.pem / logs / uploads / .git
  if (/^node_modules(\/|$)/.test(e)) return true;
  if (/\/node_modules(\/|$)/.test(e)) return true;
  if (/^cert(\/|$)/.test(e) || /\/cert(\/|$)/.test(e)) return true;
  if (/^logs(\/|$)/.test(e) || /\/logs\//.test(e)) return true;
  if (/^uploads(\/|$)/.test(e) || /\/uploads\//.test(e)) return true;
  if (/^.git(\/|$)/.test(e) || /\/.git\//.test(e)) return true;
  if (/\.(pem|key|pfx|p12)$/.test(lower)) return true;
  // .env 或 .env.* 但不是 .example
  const envMatch = e.match(/(^|\/)\.env(\.[a-zA-Z0-9_-]+)?$/);
  if (envMatch && !e.endsWith('.example')) return true;
  return false;
});
check('backend-runtime 不含 node_modules/.env.真实/证书/logs/uploads/.git',
  badBackendEntries.length === 0, badBackendEntries.length ? badBackendEntries.slice(0, 5).join(' | ') : '');
// 同时确认必须有的入口
const requiredBackend = [
  'dist/main.js',
  'package.json',
  'ecosystem.config.cjs',
  'ecosystem.config.js',
  '.env.production.example',
  'deploy/bt-panel-deploy-guide.md',
  'deploy/nginx.bt-panel-admin.conf',
  'deploy/nginx.bt-panel-h5.conf',
];
for (const e of requiredBackend) {
  check(`backend-runtime 包含 ${e}`, be.includes(e));
}

// ---------- TR 3：admin/miniapp zip 根结构正确 ----------
console.log('\n=== TR 3：admin & miniapp zip 根目录结构 ===');
const adminEntries = zipEntries['admin-dist.zip'].entries;
const miniEntries = zipEntries['miniapp-h5.zip'].entries;
check('admin-dist 解包后有 dist/index.html', adminEntries.includes('dist/index.html'),
  `共 ${adminEntries.length} 个文件`);
check('miniapp-h5 解包后有 dist/build/h5/index.html', miniEntries.includes('dist/build/h5/index.html'),
  `共 ${miniEntries.length} 个文件`);
// 额外兜底：admin-dist 不该有 node_modules 或 .git（虽然 admin 构建产物本身不包含，但仍校验）
check('admin-dist 不含 node_modules', !adminEntries.some((e) => e.includes('node_modules/')));
check('miniapp-h5 不含 node_modules', !miniEntries.some((e) => e.includes('node_modules/')));

// 清理解包
fs.rmSync(TMP, { recursive: true, force: true });

console.log(`\n=== Task 6 TR 总失败数：${FAIL} ===`);
if (FAIL > 0) process.exit(1);
