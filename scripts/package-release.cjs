// 拾家有方标准发布打包脚本（对应 Task 6: package:all）
// 用法：
//   node scripts/package-release.cjs                # 全量打包三份 zip
//   node scripts/package-release.cjs --backend-only  # 只打后端 runtime
//   node scripts/package-release.cjs --admin-only    # 只打 admin 静态
//   node scripts/package-release.cjs --miniapp-only  # 只打 miniapp H5
//
// 产物统一输出到仓库根 dist-release/：
//   - backend-runtime.zip  : 后端运行时（dist+package+ecosystem+example+部署手册+nginx）
//   - admin-dist.zip       : admin 前端静态（admin/dist/**）
//   - miniapp-h5.zip       : 小程序 H5 构建（miniapp/dist/**）
// ========================================================================

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const archiver = require('archiver');

const ROOT = path.resolve(__dirname, '..');
const DIST_RELEASE = path.join(ROOT, 'dist-release');

// --- CLI 模式解析 ---
const ONLY_BACKEND = process.argv.includes('--backend-only');
const ONLY_ADMIN = process.argv.includes('--admin-only');
const ONLY_MINIAPP = process.argv.includes('--miniapp-only');
const DO_ALL = !(ONLY_BACKEND || ONLY_ADMIN || ONLY_MINIAPP);
const DO_BACKEND = DO_ALL || ONLY_BACKEND;
const DO_ADMIN = DO_ALL || ONLY_ADMIN;
const DO_MINIAPP = DO_ALL || ONLY_MINIAPP;

// --------------------------- 核心工具函数 ---------------------------

/** 清理旧产物目录（只删 zip 文件，避免误删） */
function cleanupDistRelease() {
  fs.mkdirSync(DIST_RELEASE, { recursive: true });
  for (const f of fs.readdirSync(DIST_RELEASE)) {
    if (!f.endsWith('.zip')) continue;
    const p = path.join(DIST_RELEASE, f);
    fs.rmSync(p, { force: true });
  }
}

/** 创建 archiver 实例 + 跟踪完成的 Promise */
function createZip(outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const output = fs.createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  const done = new Promise((resolve, reject) => {
    output.on('close', () => resolve({ size: archive.pointer() }));
    archive.on('error', reject);
    output.on('error', reject);
  });
  return { archive, finalize: () => archive.finalize(), done };
}

/**
 * 调用目标项目的 npm run <cmd>。
 * 不用 npm.cmd 启动（路径含空格在 PowerShell + shell:true 下会被截断），
 * 直接用当前 node.exe 调 <node_install>/node_modules/npm/bin/npm-cli.js ——业界标准兜底。
 */
function npmRun(cwd, cmd, extraArgs = []) {
  const nodeExe = process.execPath;
  const npmCli = path.join(path.dirname(nodeExe), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (!fs.existsSync(npmCli)) {
    throw new Error(`[FATAL] 找不到 npm-cli.js（${npmCli}），无法自动 build`);
  }
  const pretty = `npm run ${cmd}${extraArgs.length ? ' ' + extraArgs.join(' ') : ''}  @ ${path.relative(ROOT, cwd) || '.'}`;
  console.log(`  $ ${pretty}`);
  const res = spawnSync(nodeExe, [npmCli, 'run', cmd, ...extraArgs], {
    cwd,
    stdio: [0, 1, 2],
    env: process.env,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`[FATAL] ${pretty} 失败，exit=${res.status || 'null'}。请在对应子目录手动 build 后重试。`);
  }
}

/** 自动 build 三个子项目（按打包触发对应项） */
function autoBuildIfNeeded() {
  if (DO_BACKEND) {
    const distMain = path.join(ROOT, 'backend', 'dist', 'main.js');
    if (!fs.existsSync(distMain) || process.argv.includes('--force-build')) {
      console.log('\n[build] backend/dist/main.js 不存在或 --force-build，执行 npm run build');
      npmRun(path.join(ROOT, 'backend'), 'build');
    }
  }
  if (DO_ADMIN) {
    const html = path.join(ROOT, 'admin', 'dist', 'index.html');
    if (!fs.existsSync(html) || process.argv.includes('--force-build')) {
      console.log('\n[build] admin/dist/index.html 不存在或 --force-build，执行 npm run build');
      npmRun(path.join(ROOT, 'admin'), 'build');
    }
  }
  if (DO_MINIAPP) {
    const h5 = path.join(ROOT, 'miniapp', 'dist', 'build', 'h5', 'index.html');
    if (!fs.existsSync(h5) || process.argv.includes('--force-build')) {
      console.log('\n[build] miniapp/dist/build/h5/index.html 不存在或 --force-build，执行 build:h5');
      npmRun(path.join(ROOT, 'miniapp'), 'build:h5');
    }
  }
}

/**
 * 将本地目录 sourceDir 下全部文件打入 zip 的 zipPrefix 前缀下。
 * excludePatterns 是一组"包含即跳过"的正则（相对 sourceDir 的路径）。
 */
function addDirectory(archive, sourceDir, zipPrefix, excludePatterns) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`[FATAL] 需要打包的目录不存在: ${sourceDir}\n请先执行对应 build 命令再打包。`);
  }
  const prefix = zipPrefix ? zipPrefix.replace(/\/$/, '') + '/' : '';
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const rel = path.relative(sourceDir, full).split(path.sep).join('/');
      // 命中任一排除正则则跳过（目录跳过代表整个子树被剪枝）
      if (excludePatterns.some((re) => re.test(rel) || re.test(ent.name))) continue;
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile()) {
        archive.file(full, { name: prefix + rel });
      }
    }
  }
  walk(sourceDir);
}

/** 把单个文件打入 zip，指定 zip 内路径 */
function addFile(archive, filePath, zipName) {
  if (!fs.existsSync(filePath)) return false;
  archive.file(filePath, { name: zipName });
  return true;
}

/** 计算文件 sha256 */
function sha256Of(p) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

/** 人类可读文件大小 */
function humanSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes,
    i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`;
}

// --------------------------- 后端包排除规则 ---------------------------
// 严格按 tasks.md 要求排除，防止敏感/无用文件进入 zip
const BACKEND_EXCLUDES = [
  /(^|\/)node_modules(\/|$)/, // 所有 node_modules
  /(^|[\\/])\.env(\.[a-zA-Z0-9_-]+)?(?!\.example)$/, // .env / .env.production 等真实配置；但保留 .example
  /(^|\/)cert(\/|$)/, // 证书目录
  /\.pem$/,
  /\.key$/,
  /\.pfx$/,
  /\.p12$/,
  /(^|\/)logs(\/|$)/, // 日志
  /(^|\/)uploads(\/|$)/, // 上传
  /(^|\/)\.git(\/|$)/, // git
  /\.tsbuildinfo$/, // tsc 增量构建缓存
  /(^|\/)\.trae(\/|$)/, // TRAE 工作目录
];

// 同时用于 deploy/ 目录的部署文档打包（把所有非敏感/非二进制都打进去）
const DEPLOY_EXCLUDES = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.git(\/|$)/,
  /\.pem$/,
  /\.key$/,
  /\.pfx$/,
];

// --------------------------- 三份 zip 实现 ---------------------------
async function buildBackendZip() {
  const outPath = path.join(DIST_RELEASE, 'backend-runtime.zip');
  const { archive, finalize, done } = createZip(outPath);

  const backendDir = path.join(ROOT, 'backend');

  // 1. backend/dist/**（编译后的 JS，必须先 build 过）
  addDirectory(archive, path.join(backendDir, 'dist'), 'dist', BACKEND_EXCLUDES);

  // 2. package.json / package-lock.json（服务器再 npm install）
  addFile(archive, path.join(backendDir, 'package.json'), 'package.json');
  if (!addFile(archive, path.join(backendDir, 'package-lock.json'), 'package-lock.json')) {
    console.warn('[WARN] backend/package-lock.json 不存在，服务器端安装会慢');
  }

  // 3. PM2 生态配置（.cjs 为主，.js 兼容兜底）
  addFile(archive, path.join(backendDir, 'ecosystem.config.cjs'), 'ecosystem.config.cjs');
  addFile(archive, path.join(backendDir, 'ecosystem.config.js'), 'ecosystem.config.js');

  // 4. 环境变量模板（注意：这里只打包 .example，真实 .env.production 已在 BACKEND_EXCLUDES 排除）
  addFile(archive, path.join(backendDir, '.env.production.example'), '.env.production.example');

  // 5. deploy/ 下的宝塔部署手册 + 两份 Nginx 模板（tasks.md 明确要求）
  const deployDir = path.join(ROOT, 'deploy');
  if (fs.existsSync(deployDir)) {
    const deployFiles = [
      'bt-panel-deploy-guide.md',
      'nginx.bt-panel-admin.conf',
      'nginx.bt-panel-h5.conf',
    ];
    for (const f of deployFiles) {
      const p = path.join(deployDir, f);
      if (fs.existsSync(p)) addFile(archive, p, `deploy/${f}`);
      else console.warn(`[WARN] Task 8 文件还未生成（稍后会创建），未进入 zip: deploy/${f}`);
    }
    // 顺手把其它已存在的 deploy/*.md 也打进去作为参考
    for (const f of fs.readdirSync(deployDir)) {
      if (deployFiles.includes(f)) continue;
      if (!f.endsWith('.md') && !f.endsWith('.conf')) continue;
      const p = path.join(deployDir, f);
      if (DEPLOY_EXCLUDES.some((re) => re.test(f))) continue;
      addFile(archive, p, `deploy/${f}`);
    }
  }

  await finalize();
  const { size } = await done;
  return { name: 'backend-runtime.zip', path: outPath, size };
}

async function buildAdminZip() {
  const outPath = path.join(DIST_RELEASE, 'admin-dist.zip');
  const { archive, finalize, done } = createZip(outPath);
  // 只打 admin/dist/**，zip 根就是 dist/（tasks TR 要求解包即有 dist/index.html）
  addDirectory(archive, path.join(ROOT, 'admin', 'dist'), 'dist', [
    /(^|\/)node_modules(\/|$)/,
    /(^|\/)\.git(\/|$)/,
  ]);
  await finalize();
  const { size } = await done;
  return { name: 'admin-dist.zip', path: outPath, size };
}

async function buildMiniappZip() {
  const outPath = path.join(DIST_RELEASE, 'miniapp-h5.zip');
  const { archive, finalize, done } = createZip(outPath);
  // 只打 miniapp/dist/**，zip 根就是 dist/（tasks TR 要求解包即有 dist/build/h5/index.html）
  addDirectory(archive, path.join(ROOT, 'miniapp', 'dist'), 'dist', [
    /(^|\/)node_modules(\/|$)/,
    /(^|\/)\.git(\/|$)/,
    /(^|\/)unpackage(\/|$)/, // uni-app 可能输出到 unpackage，我们不打包
  ]);
  await finalize();
  const { size } = await done;
  return { name: 'miniapp-h5.zip', path: outPath, size };
}

// --------------------------- 主流程 ---------------------------
async function main() {
  console.log('==============================');
  console.log('拾家有方 · 打包脚本 package-release');
  console.log(`打包范围: ${DO_BACKEND ? '[backend]' : ''} ${DO_ADMIN ? '[admin]' : ''} ${DO_MINIAPP ? '[miniapp-h5]' : ''}`);
  console.log(`仓库根: ${ROOT}`);
  console.log(`输出目录: ${DIST_RELEASE}`);
  console.log('==============================');

  cleanupDistRelease();

  // package-release 不再要求用户"记得先 build"——缺产物就自动 build；想强制重编传 --force-build
  autoBuildIfNeeded();

  const results = [];
  if (DO_BACKEND) results.push(await buildBackendZip());
  if (DO_ADMIN) results.push(await buildAdminZip());
  if (DO_MINIAPP) results.push(await buildMiniappZip());

  console.log('\n===== 打包完成 ====');
  console.log(`${'产物'.padEnd(24)}${'大小'.padStart(12)}${'sha256（前 16 位）'.padStart(26)}`);
  console.log('-'.repeat(64));
  for (const r of results) {
    const sha = sha256Of(r.path);
    console.log(`${r.name.padEnd(24)}${humanSize(r.size).padStart(12)}${sha.slice(0, 32).padStart(26)}`);
    // 顺便落个 sha256 文本，服务器端可 diff 校验
    fs.writeFileSync(r.path + '.sha256', `${sha}  ${r.name}\n`, 'utf8');
  }
  console.log('\n✔ 全部产物已生成（sha256 文本同目录伴生）');
}

main().catch((e) => {
  console.error('\n[FATAL] 打包失败：', e && e.message ? e.message : e);
  process.exit(1);
});
