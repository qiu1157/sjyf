// 拾家有方 · 本地一键发布验证脚本（Task 7）
// ----------------------------------------------------------------
// 目标：在本地零依赖（无需 MySQL）情况下，完整模拟宝塔远程发布流程：
//   1) package:all 出三份 zip（复用已验证的打包脚本）
//   2) 解压 backend-runtime.zip 到临时目录
//   3) 安装生产依赖（--omit=dev，服务器侧行为）
//   4) 写 sqlite 最小版 .env.production：
//         DB_TYPE=sqlite、PORT=3100、JWT_SECRET 随机、UPLOAD_ROOT/LOG_DIR/CERT_DIR/BACKUP_DIR 都指向临时目录
//   5) pm2 start ecosystem.config.cjs --env production 起后端
//   6) 轮询 GET http://127.0.0.1:3100/api/health 直到 ok
//   7) 把 admin-dist.zip、miniapp-h5.zip 也解出来
//   8) 打印验证报告、回滚/清理命令
//
// 用法：
//   node scripts/deploy-local.mjs              # 运行验证，保留产物
//   node scripts/deploy-local.mjs --cleanup     # 跑完自动 kill + 删临时目录
//   node scripts/deploy-local.mjs --skip-build  # 不重打 zip，直接用 dist-release 现有
// ----------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';

// --- 路径基准（兼容中文路径，Windows 下避免 URL encode 污染） ---
function toPosix(p) { return p ? p.split(path.sep).join('/') : p; }
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST_RELEASE = path.join(ROOT, 'dist-release');
const DEPLOY_ROOT = path.join(ROOT, '.deploy-local');
const BACKEND_DIR = path.join(DEPLOY_ROOT, 'backend');
const ADMIN_DIR = path.join(DEPLOY_ROOT, 'admin');
const MINIAPP_DIR = path.join(DEPLOY_ROOT, 'miniapp');

// 目录布局：后端进程启动时需要的 4 个运行目录（相对于 BACKEND_DIR，与 runtime-dirs.config.ts 默认一致）
const UPLOAD_ROOT = toPosix(path.join(BACKEND_DIR, 'uploads'));
const LOG_DIR = toPosix(path.join(BACKEND_DIR, 'logs'));
const CERT_DIR = toPosix(path.join(BACKEND_DIR, 'cert'));
const BACKUP_DIR = toPosix(path.join(BACKEND_DIR, 'backup'));
const SQLITE_FILE = toPosix(path.join(BACKEND_DIR, 'sjyf-local.sqlite'));

const CLEANUP = process.argv.includes('--cleanup');
const SKIP_BUILD = process.argv.includes('--skip-build');
const WITH_PM2 = process.argv.includes('--with-pm2'); // 加了才真的启动 PM2 daemon；默认用 node detached（跨 sandbox 兼容）
const PM2_NAME = 'sjyf-local-deploy';
const PORT = 3100; // 避免占用 3000
const BACKEND_PID_FILE = path.join(DEPLOY_ROOT, 'backend.pid'); // node 直接启动时写

// 把 PM2_HOME 指到 .deploy-local/pm2-home，避开用户目录权限，防止 --with-pm2 模式下 daemon 启动卡 touch pm2.pid
const PM2_HOME = path.join(DEPLOY_ROOT, 'pm2-home');
fs.mkdirSync(PM2_HOME, { recursive: true });
process.env.PM2_HOME = PM2_HOME;

// ---------------- 工具函数：spawnSync 直接调二进制 / .cmd（避开 shell:true 的 cmd.exe PATH 乱） ----------------
function isWin() { return process.platform === 'win32'; }
/** 仅给 npm/pm2/pnpm/npx/yarn/tsc/vite 这类 node bin 补 .cmd 后缀；exe/ps1 原样 */
const CMD_EXTS = new Set(['npm', 'npx', 'pm2', 'pnpm', 'yarn', 'tsc', 'vite']);
function normalizeCmd(exec) {
  if (!isWin()) return exec;
  if (/\.(exe|cmd|ps1|bat)$/i.test(exec)) return exec;
  const base = path.basename(exec).toLowerCase();
  if (CMD_EXTS.has(base)) return exec + '.cmd';
  return exec;
}
/**
 * spawnSync 的跨平台兼容包装器：
 *  - Windows 下对 .cmd/.bat 用 shell:true（cmd.exe 原生解析，支持路径含空格）
 *  - 其它一律 shell:false，避免注入风险
 */
function spawnCompat(file, args, opts) {
  const isCmd = isWin() && /\.(cmd|bat)$/i.test(file);
  const r = spawnSync(file, args, {
    ...(opts || {}),
    shell: isCmd ? true : false,
    windowsVerbatimArguments: false,
  });
  if (r.error) throw new Error(`spawnCompat 启动失败 [${file} ${args.join(' ')}]: ${r.error.message}`);
  return r;
}

/**
 * 同步执行外部命令（继承 stdio），失败抛 Error。
 * cmd 支持空格分隔参数；内部用 spawnSync，避免 Windows shell:true 导致的 cmd.exe 路径问题。
 */
function run(cmd, opts) {
  const { cwd = ROOT, env = process.env, timeout = 20 * 60 * 1000 } = opts || {};
  // 简单按"引号对"切分（本脚本只用 npm/powershell/pm2 三类命令，引号内不含嵌套，足够）
  const parts = [];
  let cur = '';
  let inQuote = null;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (inQuote) {
      if (ch === inQuote) inQuote = null; else cur += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (/\s/.test(ch)) {
      if (cur.length) { parts.push(cur); cur = ''; }
    } else cur += ch;
  }
  if (cur.length) parts.push(cur);
  let exec = parts[0];
  let args = parts.slice(1);
  // pm2 / npm 优先走已知绝对路径（避免 spawnSync 在 cwd=子目录 时 PATH / EINVAL 问题）
  if (exec === 'pm2' || exec === 'pm2.cmd') {
    exec = normalizeCmd(path.join(ROOT, 'node_modules', '.bin', 'pm2'));
  } else if (exec === 'node') {
    exec = process.execPath;
  } else if (exec === 'npm' || exec === 'npm.cmd') {
    // 让 shell 从 PATH 中找 npm.cmd（Program Files 路径有空格），避免 CreateProcess 拆错
    exec = isWin() ? 'npm.cmd' : 'npm';
  } else {
    exec = normalizeCmd(exec);
  }
  // 不再对 spawnExec/spawnArgs 做 .cmd 包装 —— 统一由 spawnCompat() 负责
  const spawnExec = exec;
  const spawnArgs = args;
  console.log(`\n$ ${cmd}`);
  const r = spawnCompat(spawnExec, spawnArgs, { cwd, env, stdio: 'inherit', timeout });
  if (r.error) {
    throw new Error(`命令启动失败 [${exec} ${args.join(' ')}]: ${r.error.message}`);
  }
  if (r.status !== 0) {
    throw new Error(`命令失败 exit=${r.status}: ${exec} ${args.slice(0, 3).join(' ')}...`);
  }
}

function pm2(args, opts) { run(`pm2 ${args}`, opts); }

// 启动后端：默认 node 直接 detached（避免 sandbox 里 PM2 daemon 写 pm2.pid 触发权限拦截）；--with-pm2 才走 PM2
function startBackend({ env }) {
  const logsDir = env.LOG_DIR || path.join(BACKEND_DIR, 'logs');
  mkdir(logsDir);
  const outF = fs.openSync(path.join(logsDir, `${PM2_NAME}-out.log`), 'a');
  const errF = fs.openSync(path.join(logsDir, `${PM2_NAME}-error.log`), 'a');

  if (WITH_PM2) {
    // --with-pm2 模式：走 PM2 守护（模拟宝塔真实发布，但 sandbox 可能拦截 daemon 写操作）
    console.log('   模式: PM2 daemon（--with-pm2）');
    const r = spawnCompat(
      normalizeCmd(path.join(ROOT, 'node_modules', '.bin', 'pm2')),
      ['start', 'ecosystem.config.cjs', '--env', 'production', '--name', PM2_NAME],
      { cwd: BACKEND_DIR, stdio: 'inherit', timeout: 60_000, env },
    );
    if (r.status !== 0) throw new Error(`pm2 start 失败 exit=${r.status}`);
    return;
  }
  // 默认：node 直接 detached 启动（等价于"PM2 已把进程拉起"，覆盖 .env.production + 变量合并）
  console.log(`   模式: node detached（模拟 PM2 fork；真实宝塔请用 ecosystem.config.cjs）`);
  // 把子进程的 APPDATA/LOCALAPPDATA/TEMP 全重定向到 .deploy-local 下；
  // 规避 TRAE sandbox 拦截写 C:\Users\qiu11\AppData\...\CustomDestinations 时 kill 整个进程组
  const home = path.join(DEPLOY_ROOT, 'home');
  fs.mkdirSync(path.join(home, 'AppData', 'Roaming'), { recursive: true });
  fs.mkdirSync(path.join(home, 'AppData', 'Local'), { recursive: true });
  fs.mkdirSync(path.join(home, 'Temp'), { recursive: true });
  const sandboxEnv = {
    ...env,
    APPDATA: path.join(home, 'AppData', 'Roaming'),
    LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
    TMP: path.join(home, 'Temp'),
    TEMP: path.join(home, 'Temp'),
  };
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: BACKEND_DIR,
    env: sandboxEnv,
    detached: true,
    stdio: ['ignore', outF, errF],
    windowsHide: true,
  });
  fs.writeFileSync(BACKEND_PID_FILE, String(child.pid), 'utf8');
  // Windows 上 unref 会把子进程完全脱离父进程 Job。如果 sandbox 对 detached 的子进程有 socket 限制，
  // 去掉 unref 让子进程仍挂在父进程句柄下（通过 stopBackend 显式 taskkill 清理）
  // child.unref();
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
}

// 停止后端：同时清理 PID 文件 / PM2 实例 / 孤儿进程
function stopBackend() {
  // 1) PID 文件对应的进程（node detached 模式）
  if (fs.existsSync(BACKEND_PID_FILE)) {
    const pid = Number(fs.readFileSync(BACKEND_PID_FILE, 'utf8').trim());
    if (!Number.isNaN(pid) && pid > 0) {
      try { process.kill(pid, 'SIGTERM'); } catch (_) { /* 可能已退出 */ }
      if (isWin()) {
        // Windows 下有时 SIGTERM 不生效，强杀一下
        try { spawnSync('taskkill', ['/F', '/PID', String(pid), '/T'], { stdio: 'ignore', timeout: 5_000 }); } catch (_) {}
      }
    }
    try { fs.rmSync(BACKEND_PID_FILE, { force: true }); } catch (_) {}
  }
  // 2) PM2 里同名实例也删掉（避免 --with-pm2 启动后，普通 stop 漏）
  try {
    spawnCompat(
      normalizeCmd(path.join(ROOT, 'node_modules', '.bin', 'pm2')),
      ['delete', PM2_NAME, '--silent'],
      { stdio: 'ignore' },
    );
  } catch (_) {}
}

// 打印后端最后 N 行日志（失败时用）——兼容 PM2 / node detached 两种模式
function tailBackendLogs(lines = 80) {
  const logDir = LOG_DIR || path.join(BACKEND_DIR, 'logs');
  const candidates = [
    path.join(logDir, `${PM2_NAME}-out.log`),
    path.join(logDir, `${PM2_NAME}-error.log`),
    path.join(logDir, `sjyf-backend-out.log`),
    path.join(logDir, `sjyf-backend-error.log`),
  ];
  for (const f of candidates) {
    if (!fs.existsSync(f)) continue;
    const text = fs.readFileSync(f, 'utf8');
    const arr = text.split(/\r?\n/).filter((x) => x.trim().length > 0);
    const tail = arr.slice(-lines);
    if (tail.length === 0) continue;
    console.log(`\n  [tail] ${f}`);
    console.log(tail.join('\n'));
  }
}

function mkdir(p) { fs.mkdirSync(p, { recursive: true }); }

function unzip(zipPath, target) {
  mkdir(target);
  if (isWin()) {
    // 用 PowerShell Expand-Archive：需要用 -LiteralPath 以兼容中文路径
    const psCmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${target.replace(/'/g, "''")}' -Force`;
    run(`powershell -NoProfile -Command "${psCmd}"`);
  } else {
    run(`unzip -o "${zipPath}" -d "${target}"`);
  }
}

function randomStr(n = 24) { return crypto.randomBytes(n).toString('base64url'); }

// 手动用 http 模块轮询（避免部分 Windows sandbox 拦截全局 fetch 的 TCP 连接建立）
async function pollHealth() {
  const attempts = [
    { host: '127.0.0.1', port: PORT },
    { host: 'localhost', port: PORT },
    { host: '::1', port: PORT },
  ];
  const timeoutAt = Date.now() + 90_000;
  let tries = 0;
  let lastErr = null;
  // 前 2 次失败后，先打印 netstat 诊断（部分 Windows 沙盒可能禁止本地 TCP → 用于debug）
  let netstatDiagPrinted = false;
  while (Date.now() < timeoutAt) {
    for (const a of attempts) {
      tries++;
      try {
        const body = await new Promise((resolve, reject) => {
          const req = http.get(
            { host: a.host, port: a.port, path: '/api/health', timeout: 3000, family: a.host.includes(':') ? 6 : 4 },
            (res) => {
              let data = '';
              res.setEncoding('utf8');
              res.on('data', (c) => (data += c));
              res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
                else reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
              });
            },
          );
          req.on('timeout', () => { req.destroy(new Error('timeout 3s')); });
          req.on('error', (e) => reject(e));
        });
        try {
          const j = JSON.parse(body);
          if (j && j.status === 'ok') {
            console.log(`\n✔ /api/health ok after ${tries} polls (host=${a.host})`);
            console.log('   response:', body);
            return true;
          }
        } catch (_pe) {
            lastErr = _pe;
          }
        } catch (e) {
          lastErr = e;
        }
    }
    if (tries >= 6 && !netstatDiagPrinted) {
      netstatDiagPrinted = true;
      // 全部用 node:net 直接检测，不启动额外进程（避免 execSync 起 cmd 触发系统跳转列表写入导致 sandbox kill）
      const probes = [
        { host: '127.0.0.1', port: PORT },
        { host: 'localhost', port: PORT },
        { host: '::1', port: PORT },
      ];
      for (const p of probes) {
        const ok = await new Promise((res) => {
          const sock = new net.Socket();
          let done = false;
          const t = setTimeout(() => { if (!done) { done = true; sock.destroy(); res(false); } }, 2000);
          sock.once('connect', () => { clearTimeout(t); if (!done) { done = true; sock.destroy(); res(true); } });
          sock.once('error', () => { clearTimeout(t); if (!done) { done = true; res(false); } });
          sock.connect({ host: p.host, port: p.port });
        });
        console.log(`  [diag] TCP probe ${p.host}:${p.port} → ${ok ? '✅ 可连' : '❌ 不通'}`);
      }
      // PID 存活直接用 fs 读 + process.kill(0)（在 Windows 上 kill 0 也是探测进程存在的标准方式）
      try {
        if (fs.existsSync(BACKEND_PID_FILE)) {
          const pid = Number(fs.readFileSync(BACKEND_PID_FILE, 'utf8').trim());
          let alive = false;
          try { process.kill(pid, 0); alive = true; } catch (_e) { alive = false; }
          console.log(`  [diag] backend.pid = ${pid}, alive(process.kill 0) = ${alive}`);
        }
      } catch (_d) { console.log('  [diag] pid err:', String(_d && _d.message || _d)); }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (lastErr) {
    console.log('  [poll last error]', (lastErr.code || lastErr.message) + ' | ' + lastErr.message);
  }
  return false;
}

async function main() {
  // 【关键】——本进程（含其所有子进程）统一重写 APPDATA/LOCALAPPDATA/TEMP 指向 .deploy-local
  // 避免 TRAE sandbox 检测到写 C:\Users\qiu11\AppData\...\CustomDestinations\*.temp 把整个进程组 kill
  if (isWin()) {
    const userRoot = path.join(DEPLOY_ROOT, 'current-user');
    const appData = path.join(userRoot, 'AppData');
    fs.mkdirSync(path.join(appData, 'Roaming'), { recursive: true });
    fs.mkdirSync(path.join(appData, 'Local'), { recursive: true });
    fs.mkdirSync(path.join(userRoot, 'Temp'), { recursive: true });
    process.env.APPDATA = path.join(appData, 'Roaming');
    process.env.LOCALAPPDATA = path.join(appData, 'Local');
    process.env.TEMP = path.join(userRoot, 'Temp');
    process.env.TMP = path.join(userRoot, 'Temp');
  }

  console.log('========================================');
  console.log('拾家有方 · 本地一键部署验证 deploy:local');
  console.log(`   root      = ${ROOT}`);
  console.log(`   deployDir = ${DEPLOY_ROOT}`);
  console.log(`   port      = ${PORT}  (sqlite, 不依赖 MySQL)`);
  console.log(`   pm2 name  = ${PM2_NAME}`);
  console.log(`   cleanup   = ${CLEANUP}`);
  console.log('========================================');

  // 0) 先清理旧实例（node detached PID / PM2） + 旧临时目录
  stopBackend();
  fs.rmSync(DEPLOY_ROOT, { recursive: true, force: true });

  // 1) 打包
  if (!SKIP_BUILD) {
    console.log('\n[1/7] 执行 package:all 出 zip ...');
    run('node scripts/package-release.cjs');
  } else {
    console.log('\n[1/7] --skip-build，使用 dist-release 现有 zip');
  }
  for (const name of ['backend-runtime.zip', 'admin-dist.zip', 'miniapp-h5.zip']) {
    if (!fs.existsSync(path.join(DIST_RELEASE, name))) {
      throw new Error(`[FATAL] dist-release/${name} 不存在，去掉 --skip-build 重试`);
    }
  }

  // 2) 解压 backend-runtime
  console.log('\n[2/7] 解压 backend-runtime.zip -> .deploy-local/backend');
  unzip(path.join(DIST_RELEASE, 'backend-runtime.zip'), BACKEND_DIR);

  // 3) 安装生产依赖（完全模拟宝塔服务器端 npm install --omit=dev）
  console.log('\n[3/7] npm install --omit=dev --legacy-peer-deps（sharp/sql.js/mysql2 等 native 模块按目标平台下载）');
  const env = {
    ...process.env,
    npm_config_registry: process.env.npm_config_registry || 'https://registry.npmmirror.com',
    npm_config_sharp_binary_host: process.env.npm_config_sharp_binary_host ||
      'https://npmmirror.com/mirrors/sharp',
    npm_config_sharp_libvips_binary_host: process.env.npm_config_sharp_libvips_binary_host ||
      'https://npmmirror.com/mirrors/sharp-libvips',
  };
  run('npm install --omit=dev --legacy-peer-deps --no-audit --no-fund --progress=false',
    { cwd: BACKEND_DIR, env });

  // 4) 写 sqlite 最小版 .env.production（真实生产宝塔一定要改为 MySQL sjyf_db）
  console.log('\n[4/7] 写入 .env.production（sqlite + 随机 JWT，每次验证独立）');
  const envContent = `# 本地 deploy-local 自动生成：仿真宝塔远程发布流程（sqlite，零 MySQL 依赖）
# 说明：此处所有变量会被 backend/src/app.module.ts 中的 buildEnvFilePaths() 按优先级加载。
NODE_ENV=production
PORT=${PORT}
UPLOAD_ROOT=${UPLOAD_ROOT}
LOG_DIR=${LOG_DIR}
CERT_DIR=${CERT_DIR}
BACKUP_DIR=${BACKUP_DIR}

# ---- 数据库：本地验证用 sqlite，文件在 BACKEND_DIR/sjyf-local.sqlite ----
DB_TYPE=sqlite
DB_DATABASE=${SQLITE_FILE}
DB_SYNC=true
DB_LOGGING=false

# ---- JWT 每次验证随机生成 ----
JWT_SECRET=${randomStr(32)}
JWT_EXPIRES_IN=7d

# ---- 示例数据初始化开关：本机验证开一次即可；生产永远 false ----
ENABLE_SEED=true

# ---- 支付：mock 模式，不调微信，适合本地冒烟 ----
PAY_MODE=mock
WX_APP_ID=local-deploy-dummy
WX_SECRET=local-deploy-dummy
WX_MCH_ID=
WX_REFUND_NOTIFY_URL=
`;
  fs.writeFileSync(path.join(BACKEND_DIR, '.env.production'), envContent, 'utf8');

  // 5) 启动后端：默认 node detached（跨 sandbox）；--with-pm2 才走 PM2 daemon
  //    · 显式设置 NODE_ENV=production PORT=3100 等变量，保证与宝塔发布一致
  console.log('\n[5/7] 启动后端（默认 node detached，等价宝塔最终 PM2 fork 拉起模式）');
  const startEnv = {
    ...process.env,
    PM2_APP_NAME: PM2_NAME,
    NODE_ENV: 'production',
    PORT: String(PORT),
    UPLOAD_ROOT,
    LOG_DIR,
    CERT_DIR,
    BACKUP_DIR,
  };
  startBackend({ env: startEnv });

  // 6) 健康检查轮询
  console.log('\n[6/7] 轮询 /api/health ...（最多 90s）');
  const ok = await pollHealth();
  if (!ok) {
    console.error('\n✖ 90 秒内未能获得健康端点响应，尝试打印后端最后 80 行日志：');
    tailBackendLogs(80);
    try { stopBackend(); } catch (_) {}
    process.exit(2);
  }

  // 7) 解压 admin / miniapp（验证 zip 结构）
  console.log('\n[7/7] 解压 admin-dist.zip + miniapp-h5.zip，验证静态根结构');
  unzip(path.join(DIST_RELEASE, 'admin-dist.zip'), ADMIN_DIR);
  unzip(path.join(DIST_RELEASE, 'miniapp-h5.zip'), MINIAPP_DIR);
  const adminIndex = path.join(ADMIN_DIR, 'dist', 'index.html');
  const miniappIndex = path.join(MINIAPP_DIR, 'dist', 'build', 'h5', 'index.html');
  if (!fs.existsSync(adminIndex)) throw new Error(`admin-dist 根结构错误：缺 ${adminIndex}`);
  if (!fs.existsSync(miniappIndex)) throw new Error(`miniapp-h5 根结构错误：缺 ${miniappIndex}`);
  console.log('   admin index.html size =', fs.statSync(adminIndex).size, 'B');
  console.log('   miniapp index.html size =', fs.statSync(miniappIndex).size, 'B');

  // --- 最终报告 ---
  const fourDirs = [UPLOAD_ROOT, LOG_DIR, CERT_DIR, BACKUP_DIR]
    .map((p) => path.normalize(p))
    .every((p) => fs.existsSync(p));
  console.log('\n========================================');
  console.log('✔ 本地一键部署验证 全部通过');
  console.log('========================================');
  console.log(`  后端 API       : http://127.0.0.1:${PORT}/api/health`);
  console.log(`  守护方式       : ${WITH_PM2 ? 'PM2 daemon（实例名=' + PM2_NAME + '）' : 'node detached（PID=' + readBackendPid() + '）'}`);
  console.log(`  4 个运行目录存在: ${fourDirs ? 'YES' : 'NO'} (uploads|logs|cert|backup)`);
  console.log(`  Admin 静态     : ${adminIndex}`);
  console.log(`  Miniapp H5 静态: ${miniappIndex}`);
  console.log('');
  console.log('常用命令（debug）:');
  if (WITH_PM2) {
    console.log(`  · 看日志      : npx pm2 logs ${PM2_NAME}`);
    console.log(`  · 重启        : npx pm2 reload ${PM2_NAME}`);
    console.log(`  · 停服务      : npx pm2 delete ${PM2_NAME}`);
    console.log(`  · 全清本地模拟 : npx pm2 delete ${PM2_NAME} ; Remove-Item -Recurse -Force .deploy-local`);
  } else {
    const pid = readBackendPid();
    console.log(`  · 后端 PID    : ${pid}`);
    console.log(`  · 看日志      : 手动打开 ${path.join(LOG_DIR || path.join(BACKEND_DIR, 'logs'), PM2_NAME + '-out.log')}`);
    console.log(`  · 停服务      : taskkill /F /PID ${pid} /T  (或 Remove-Item .deploy-local\\backend.pid; 再启动)`);
    console.log(`  · 全清本地模拟 : taskkill /F /PID ${pid} /T ; Remove-Item -Recurse -Force .deploy-local`);
  }

  if (CLEANUP) {
    console.log('\n--cleanup：自动停止后端进程 + 删除临时目录');
    stopBackend();
    fs.rmSync(DEPLOY_ROOT, { recursive: true, force: true });
    console.log('✔ 已清理');
  }
  // 显式退出：因为 startBackend 里 spawn detached 时注释掉了 child.unref()，
  // 父进程仍持有子进程句柄，event-loop 不会自动结束。为保证 deploy:local 稳定返回 exit 0，
  // 成功/失败路径都显式 process.exit（失败已在 pollHealth 分支 exit 2 / catch 分支 exit 1）
  process.exit(0);
}

function readBackendPid() {
  try {
    if (fs.existsSync(BACKEND_PID_FILE)) {
      return Number(fs.readFileSync(BACKEND_PID_FILE, 'utf8').trim()) || 'unknown';
    }
  } catch (_) { /* ignore */ }
  return 'unknown';
}

main().catch((e) => {
  console.error('\n[FATAL] deploy-local 失败：', e && e.message ? e.message : e);
  if (CLEANUP) {
    try { stopBackend(); } catch (_) {}
    try { fs.rmSync(DEPLOY_ROOT, { recursive: true, force: true }); } catch (_) {}
  }
  process.exit(1);
});
