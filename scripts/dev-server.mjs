#!/usr/bin/env node
// 拾家有方 · 本地开发服务管理脚本
// ---------------------------------------------------------------------
// 能力：
//   1) 环境配置集中化：读 dev.config.json，把 backend.env 的键值同步写入 backend/.env
//      （保留 .env 中其它手写配置与注释），数据库/端口等改一处即可生效
//   2) 一键同时启动：后端(3000) + 管理端(5173) + 小程序H5(5174)
//   3) 支持整体或单服务重启 / 停止 / 状态查看
//
// 用法（在项目根目录执行）：
//   npm run dev                       # 启动全部（已运行的跳过）
//   npm run dev:restart               # 重启全部
//   npm run dev:restart -- backend    # 只重启后端
//   npm run dev:stop                  # 停止全部
//   npm run dev:status                # 查看运行状态
//   node code/scripts/dev-server.mjs <start|restart|stop|status> [backend|admin|miniapp|all]
// ---------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const IS_WIN = process.platform === 'win32';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 解析真实的 code/ 目录。
 * 兼容两种调用方式：真实路径 code/scripts/xxx 与根目录 scripts/（Junction）快捷路径。
 */
function resolveProjectRoot() {
  const direct = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(direct, 'backend', 'package.json'))) return direct;
  const nested = path.join(direct, 'code');
  if (fs.existsSync(path.join(nested, 'backend', 'package.json'))) return nested;
  throw new Error(`无法定位项目目录（未找到 backend/package.json），脚本所在目录：${__dirname}`);
}

const PROJECT_ROOT = resolveProjectRoot();
const CONFIG_FILE = path.join(__dirname, 'dev.config.json');
const RUN_DIR = path.join(PROJECT_ROOT, '.dev-run');
const LOG_DIR = path.join(RUN_DIR, 'logs');
const STATE_FILE = path.join(RUN_DIR, 'state.json');

const SERVICE_NAMES = ['backend', 'admin', 'miniapp'];
const SERVICE_LABELS = { backend: '后端', admin: '管理端', miniapp: '小程序H5' };
const SERVICE_ALIASES = {
  backend: 'backend', 后端: 'backend', api: 'backend',
  admin: 'admin', 管理端: 'admin', 后台: 'admin',
  miniapp: 'miniapp', h5: 'miniapp', 小程序: 'miniapp',
};
const COLORS = { backend: '\x1b[36m', admin: '\x1b[35m', miniapp: '\x1b[32m' };
const RESET = '\x1b[0m';
const USE_COLOR = Boolean(process.stdout.isTTY);

// 就绪等待上限（毫秒）：后端首次编译/建表较慢，给足余量
const READY_TIMEOUT = 180_000;
// 端口释放等待上限（毫秒）
const PORT_FREE_TIMEOUT = 15_000;

// 内置默认值：dev.config.json 缺失或字段不全时兜底
const DEFAULT_CONFIG = {
  backend: {
    enabled: true,
    port: 3000,
    command: 'npm run start:dev',
    env: {
      NODE_ENV: 'development',
      PORT: '3000',
      DB_TYPE: 'mysql',
      DB_HOST: '127.0.0.1',
      DB_PORT: '3306',
      DB_USER: 'sjyf',
      DB_PASSWORD: 'change-me',
      DB_NAME: 'sjyf_db',
      DB_SYNC: 'false',
      DB_LOGGING: 'false',
      ENABLE_SEED: 'false',
      PAY_MODE: 'mock',
    },
  },
  admin: { enabled: true, port: 5173, command: 'npm run dev' },
  miniapp: { enabled: true, port: 5174, command: 'npm run dev:h5' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const colorize = (text, color) => (USE_COLOR && color ? `${color}${text}${RESET}` : text);
const log = (msg) => console.log(msg);
const warn = (msg) => console.warn(msg);
const errLog = (msg) => console.error(msg);

// ============================ 配置 ============================

function loadConfig() {
  let fileConfig = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      throw new Error(`dev.config.json 解析失败：${e.message}`);
    }
  } else {
    warn(`[warn] 未找到 ${CONFIG_FILE}，使用内置默认配置`);
  }

  const merged = {};
  for (const name of SERVICE_NAMES) {
    const base = DEFAULT_CONFIG[name];
    const custom = fileConfig[name] || {};
    merged[name] = {
      ...base,
      ...custom,
      env: { ...(base.env || {}), ...(custom.env || {}) },
    };
  }
  return merged;
}

/** 取服务监听端口：优先 backend.env.PORT，其次服务级 port */
function resolvePort(cfg) {
  const fromEnv = Number(cfg?.env?.PORT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  const p = Number(cfg?.port);
  return Number.isFinite(p) && p > 0 ? p : null;
}

function stringifyEnv(env) {
  const out = {};
  for (const [k, v] of Object.entries(env || {})) out[k] = String(v);
  return out;
}

/**
 * 把键值写入 .env：已存在的键就地替换，缺失的键追加到文件末尾；
 * 返回实际发生变化的键名列表（值相同则不动文件，避免无谓改动）。
 */
function upsertEnvFile(filePath, kv) {
  const existed = fs.existsSync(filePath);
  const original = existed ? fs.readFileSync(filePath, 'utf8') : '';
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const keys = Object.keys(kv);
  const handled = new Set();
  const changed = [];

  const lines = original.split(/\r?\n/).map((line) => {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!m || !keys.includes(m[1])) return line;
    const key = m[1];
    handled.add(key);
    const next = String(kv[key]);
    if (m[2].trim() === next) return line;
    changed.push(key);
    return `${key}=${next}`;
  });

  const appended = keys.filter((k) => !handled.has(k));
  if (appended.length) {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    lines.push('', '# ---- 由 scripts/dev-server.mjs 依 dev.config.json 自动同步 ----');
    for (const k of appended) lines.push(`${k}=${kv[k]}`);
    lines.push('');
    changed.push(...appended);
  }

  if (changed.length || !existed) {
    fs.writeFileSync(filePath, lines.join(eol), 'utf8');
  }
  return changed;
}

// ============================ 进程状态 ============================

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** 杀掉进程及其全部子进程（npm -> vite / ts-node-dev 为多级派生） */
function killTree(pid) {
  if (!pid) return;
  if (IS_WIN) {
    spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore', timeout: 10_000 });
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* 进程可能已退出 */
    }
  }
}

function probePortOnce(host, port, timeout) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeout);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
    sock.connect({ host, port });
  });
}

// Vite 默认可能只监听 IPv6（[::1]），因此两个地址都要探测
const PROBE_HOSTS = ['127.0.0.1', '::1'];

async function probePort(port, timeout = 800) {
  if (!port) return false;
  for (const host of PROBE_HOSTS) {
    if (await probePortOnce(host, port, timeout)) return true;
  }
  return false;
}

/** 后端就绪判定：/api/health 返回 status=ok */
function probeHealth(port) {
  return new Promise((resolve) => {
    if (!port) return resolve(false);
    const req = http.get(
      { host: '127.0.0.1', port, path: '/api/health', timeout: 2000 },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body)?.status === 'ok');
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function waitPortFree(port, timeout = PORT_FREE_TIMEOUT) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!(await probePort(port))) return true;
    await sleep(500);
  }
  return !(await probePort(port));
}

// ============================ 启动 / 停止 ============================

function pipeWithPrefix(stream, name, logStream) {
  const prefix = colorize(`[${name}]`, COLORS[name]);
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    logStream.write(chunk);
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) process.stdout.write(`${prefix} ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer) process.stdout.write(`${prefix} ${buffer}\n`);
  });
}

function startService(name, cfg, state) {
  const cwd = path.join(PROJECT_ROOT, name);
  const port = resolvePort(cfg);

  if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
    errLog(`[error] ${SERVICE_LABELS[name]} 缺少依赖，请先在该目录执行 npm install（${cwd}）`);
    return null;
  }
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, `${name}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  logStream.write(`\n===== ${new Date().toLocaleString()} 启动：${cfg.command} (cwd=${cwd}) =====\n`);

  // backend 的 env 同时注入进程环境，保证 .env 缺失时也能带上数据库等关键配置
  const extraEnv = name === 'backend' ? stringifyEnv(cfg.env) : {};
  const child = spawn(cfg.command, [], {
    cwd,
    env: { ...process.env, ...extraEnv, FORCE_COLOR: '1' },
    shell: true,
    windowsHide: true,
    detached: !IS_WIN,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pipeWithPrefix(child.stdout, name, logStream);
  pipeWithPrefix(child.stderr, name, logStream);

  child.on('exit', (code, signal) => {
    log(colorize(`[${name}] 进程已退出（code=${code ?? '-'} signal=${signal ?? '-'}）`, COLORS[name]));
    const latest = readState();
    // 仅清理仍是本进程的登记，避免重启时误删新进程记录
    if (latest[name]?.pid === child.pid) {
      delete latest[name];
      writeState(latest);
    }
  });
  child.on('error', (e) => errLog(`[error] ${SERVICE_LABELS[name]} 启动失败：${e.message}`));

  state[name] = {
    pid: child.pid,
    label: SERVICE_LABELS[name],
    command: cfg.command,
    cwd,
    port,
    logFile,
    startedAt: new Date().toISOString(),
  };
  writeState(state);
  log(`[start] ${SERVICE_LABELS[name]} → ${cfg.command}（pid=${child.pid}${port ? `, port=${port}` : ''}）`);
  return child;
}

async function stopService(name, state, { quiet = false } = {}) {
  const info = state[name];
  if (!info?.pid) {
    delete state[name];
    writeState(state);
    if (!quiet) log(`[stop] ${SERVICE_LABELS[name]} 未在运行`);
    return true;
  }

  if (isAlive(info.pid)) {
    killTree(info.pid);
    const freed = await waitPortFree(info.port);
    if (!quiet) {
      log(`[stop] ${SERVICE_LABELS[name]} 已停止（pid=${info.pid}${freed ? '' : '，端口未及时释放'}）`);
    }
  } else if (!quiet) {
    log(`[stop] ${SERVICE_LABELS[name]} 进程已不存在（清理残留记录）`);
  }

  delete state[name];
  writeState(state);
  return true;
}

// ============================ 命令实现 ============================

function normalizeTargets(targetArg, config) {
  const raw = (targetArg || 'all').toLowerCase();
  if (raw === 'all') return SERVICE_NAMES.filter((n) => config[n].enabled !== false);
  const name = SERVICE_ALIASES[raw];
  if (!name) {
    throw new Error(`未知服务「${targetArg}」，可选：all | backend | admin | miniapp`);
  }
  return [name];
}

function printBanner(title) {
  log('========================================');
  log(`拾家有方 · 本地开发服务 ${title}`);
  log(`   项目目录 : ${PROJECT_ROOT}`);
  log(`   配置文件 : ${CONFIG_FILE}`);
  log('========================================');
}

async function cmdStart(targets, { force = false } = {}) {
  const config = loadConfig();
  const state = readState();

  // start 模式只补启未运行的服务；restart 模式（force）先全部停掉
  const pending = [];
  for (const name of targets) {
    if (!config[name].enabled) {
      log(`[skip] ${SERVICE_LABELS[name]} 已在 dev.config.json 中关闭（enabled=false）`);
      continue;
    }
    const running = state[name]?.pid && isAlive(state[name].pid);
    if (running && !force) {
      const port = state[name].port;
      const ready = name === 'backend' ? await probeHealth(port) : await probePort(port);
      log(`[skip] ${SERVICE_LABELS[name]} 已在运行（pid=${state[name].pid}, port=${port}, ${ready ? '端口就绪' : '端口未就绪'}）`);
      continue;
    }
    if (running) {
      log(`[restart] 正在停止 ${SERVICE_LABELS[name]}（pid=${state[name].pid}）...`);
      await stopService(name, state, { quiet: true });
    }
    pending.push(name);
  }

  if (!pending.length) {
    log('\n没有需要启动的服务。');
    return null;
  }

  // 端口占用预检：被非本脚本管理的进程占用时提前告警
  for (const name of pending) {
    const port = resolvePort(config[name]);
    if (port && (await probePort(port))) {
      warn(`[warn] ${SERVICE_LABELS[name]} 端口 ${port} 已被其它进程占用，启动可能失败`);
    }
  }

  log('\n--- 启动服务 ---');
  const started = [];
  for (const name of pending) {
    const child = startService(name, config[name], state);
    if (child) started.push({ name, child, port: resolvePort(config[name]) });
  }
  if (!started.length) {
    errLog('\n[error] 没有任何服务启动成功，请检查依赖是否已安装。');
    return null;
  }

  log('\n--- 等待服务就绪 ---');
  for (const item of started) {
    const ready =
      item.name === 'backend'
        ? await waitReady(item.name, item.port, READY_TIMEOUT, () => probeHealth(item.port))
        : await waitReady(item.name, item.port, READY_TIMEOUT, () => probePort(item.port));
    log(
      ready
        ? `[ready] ${SERVICE_LABELS[item.name]} 就绪 → http://localhost:${item.port}`
        : `[warn] ${SERVICE_LABELS[item.name]} 在 ${Math.round(READY_TIMEOUT / 1000)}s 内未就绪，请查看日志：${path.join(LOG_DIR, `${item.name}.log`)}`,
    );
  }

  log('\n========================================');
  log('本地开发服务启动完成');
  const finalState = readState();
  for (const name of SERVICE_NAMES) {
    const info = finalState[name];
    if (!info) continue;
    const url = name === 'backend' ? `http://localhost:${info.port}/api/docs` : `http://localhost:${info.port}`;
    log(`  ${SERVICE_LABELS[name].padEnd(6)} ${url}`);
  }
  log(`  日志目录  ${LOG_DIR}`);
  log('  Ctrl+C 停止全部；另开终端可用 npm run dev:restart / dev:stop / dev:status');
  log('========================================');
  return started;
}

async function waitReady(name, port, timeoutMs, probe) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probe()) return true;
    await sleep(1000);
  }
  return false;
}

async function cmdStop(targets) {
  const state = readState();
  log('--- 停止服务 ---');
  for (const name of targets) {
    await stopService(name, state);
  }
  log('已全部停止。');
}

async function cmdStatus() {
  const config = loadConfig();
  const state = readState();
  printBanner('运行状态');
  if (!Object.keys(state).length) {
    log('当前没有由本脚本启动的服务。');
  }
  for (const name of SERVICE_NAMES) {
    const info = state[name];
    const cfgPort = resolvePort(config[name]);
    const port = info?.port ?? cfgPort;
    const enabled = config[name].enabled !== false;
    if (!info) {
      log(`  ${SERVICE_LABELS[name].padEnd(6)} ${enabled ? '未运行' : '未运行（配置已关闭）'}`);
      continue;
    }
    const alive = isAlive(info.pid);
    const portOk = await probePort(port);
    const health = name === 'backend' && portOk ? (await probeHealth(port)) : null;
    const detail = [
      `pid=${info.pid}`,
      `端口=${port}${portOk ? '(监听中)' : '(未监听)'}`,
      health === null ? null : `健康检查=${health ? 'ok' : '异常'}`,
      `启动于=${new Date(info.startedAt).toLocaleString()}`,
    ]
      .filter(Boolean)
      .join('  ');
    log(`  ${SERVICE_LABELS[name].padEnd(6)} ${alive ? '运行中' : '进程已退出'}  ${detail}`);
  }
}

function printUsage() {
  log('用法：node code/scripts/dev-server.mjs <start|restart|stop|status> [backend|admin|miniapp|all]');
  log('  start    启动未运行的服务（已在运行的跳过）');
  log('  restart  先停止再启动指定服务（默认 all）');
  log('  stop     停止指定服务（默认 all）');
  log('  status   查看各服务进程与端口状态');
}

async function main() {
  const action = (process.argv[2] || 'start').toLowerCase();
  const targetArg = process.argv[3] || 'all';

  if (action === 'help' || action === '--help' || action === '-h') {
    printUsage();
    return;
  }

  if (action === 'status') {
    await cmdStatus();
    return;
  }

  if (!['start', 'restart', 'stop'].includes(action)) {
    errLog(`[error] 未知命令：${action}`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const targets = normalizeTargets(targetArg, config);

  if (action === 'stop') {
    await cmdStop(targets);
    return;
  }

  // start / restart：同步后端环境变量（数据库配置以 dev.config.json 为准）
  printBanner(action === 'restart' ? '重启' : '启动');
  const changedKeys = upsertEnvFile(path.join(PROJECT_ROOT, 'backend', '.env'), config.backend.env);
  if (changedKeys.length) {
    log(`[env] 已同步 ${changedKeys.length} 项到 backend/.env：${changedKeys.join(', ')}`);
  } else {
    log('[env] backend/.env 与 dev.config.json 一致，无需修改');
  }

  const started = await cmdStart(targets, { force: action === 'restart' });
  if (!started) return;

  // 前台常驻：Ctrl+C 统一关闭所有子服务
  const state = readState();
  const shutdown = async () => {
    log('\n[exit] 正在关闭所有子服务 ...');
    for (const name of SERVICE_NAMES) {
      if (state[name]) await stopService(name, state, { quiet: true });
    }
    log('已全部关闭。');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  await new Promise(() => {});
}

main().catch((e) => {
  errLog(`[FATAL] ${e?.message || e}`);
  process.exit(1);
});
