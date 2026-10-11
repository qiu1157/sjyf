// Task 4 测试：验证 ecosystem.config.cjs / .js 所有关键字段 + LOG_DIR 行为
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

let FAIL = 0;
function check(label, cond) {
  const tag = cond ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${label}`);
  if (!cond) FAIL++;
}

// --- TR 1：.cjs 语法解析 OK，属性全对 ---
console.log('=== TR 1: ecosystem.config.cjs 对象属性校验 ===');
const cjs = require(path.join(__dirname, '..', 'ecosystem.config.cjs'));
const a = cjs.apps[0];
const backendRoot = __dirname.replace(/[\\/]tests$/, '');
check('name === sjyf-backend', a.name === 'sjyf-backend');
check('script 为 dist/main.js 绝对路径', a.script.endsWith(path.join('dist', 'main.js')) && path.isAbsolute(a.script));
check('cwd === backend 目录', a.cwd === backendRoot);
check('exec_mode === fork', a.exec_mode === 'fork');
check('instances === 1', a.instances === 1);
check('watch === false', a.watch === false);
check('max_memory_restart === 512M', a.max_memory_restart === '512M');
check('autorestart === true', a.autorestart === true);
check('restart_delay === 3000', a.restart_delay === 3000);
check('merge_env_vars === true', a.merge_env_vars === true);
check('merge_logs === true', a.merge_logs === true);
check('env.NODE_ENV === development', a.env.NODE_ENV === 'development');
check('env_production.NODE_ENV === production', a.env_production.NODE_ENV === 'production');
check('env_production.PORT === 3000', a.env_production.PORT === '3000');
check('out_file 含 sjyf-backend-out.log', a.out_file.endsWith('sjyf-backend-out.log'));
check('error_file 含 sjyf-backend-error.log', a.error_file.endsWith('sjyf-backend-error.log'));
check('log_rotate 已配置（size/max/interval/compress）',
  a.log_rotate && a.log_rotate.size === '10M' && a.log_rotate.max === 30 &&
  a.log_rotate.interval === '1d' && a.log_rotate.compress === true);
check('health_check 已配置（enable/interval/timeout/port）',
  a.health_check && a.health_check.enable === true && a.health_check.port === 3000);

// --- TR 2：无 logs 目录时 require 会自动创建 ---
console.log('\n=== TR 2: 自动创建 logs 目录 ===');
const defaultLogs = path.join(backendRoot, 'logs');
check('backend/logs 目录已被自动 mkdir', fs.existsSync(defaultLogs) && fs.statSync(defaultLogs).isDirectory());

// --- TR 3：LOG_DIR 环境变量覆盖 ---
console.log('\n=== TR 3: LOG_DIR 环境变量覆盖 ===');
const customLogs = fs.mkdtempSync(path.join(os.tmpdir(), 'sjyf-logtest-'));
try {
  process.env.LOG_DIR = customLogs;
  // 清 require 缓存，重新加载验证
  const resolveKey = path.join(backendRoot, 'ecosystem.config.cjs');
  delete require.cache[resolveKey];
  const cjs2 = require(resolveKey);
  const a2 = cjs2.apps[0];
  check(`out_file 路径前缀 = ${customLogs}`, a2.out_file.startsWith(customLogs));
  check(`error_file 路径前缀 = ${customLogs}`, a2.error_file.startsWith(customLogs));
  check(`customLogs 目录存在且为目录`, fs.existsSync(customLogs) && fs.statSync(customLogs).isDirectory());
} finally {
  delete process.env.LOG_DIR;
  fs.rmSync(customLogs, { recursive: true, force: true });
}

// --- .js deprecated 标记检查 ---
console.log('\n=== 附加：ecosystem.config.js deprecated 标记 ===');
const jsPath = path.join(backendRoot, 'ecosystem.config.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');
check('首行包含 DEPRECATED 标记', /^\/\/\s*DEPRECATED\s*:\s*/m.test(jsContent));
check('首行提示 2026-11-10 移除', jsContent.includes('2026-11-10'));
check('内容与 .cjs 等价：有 sjyf-backend 字串 / watch false / merge_env_vars true',
  jsContent.includes("sjyf-backend") &&
  /watch:\s*false/.test(jsContent) &&
  /merge_env_vars:\s*true/.test(jsContent) &&
  /max_memory_restart:\s*['"]512M['"]/.test(jsContent) &&
  /restart_delay:\s*3000/.test(jsContent) &&
  /health_check:\s*\{/.test(jsContent));

console.log(`\n=== 共 ${FAIL} 项失败 ===`);
if (FAIL > 0) process.exit(1);
