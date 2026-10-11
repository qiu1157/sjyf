const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const { resolveUploadRoot } = require('../dist/config/upload.config');
const {
  resolveLogDir,
  resolveCertDir,
  resolveBackupDir,
  ensureRuntimeDirs,
} = require('../dist/config/runtime-dirs.config');

test('resolveUploadRoot 默认回退到当前工作目录下的 uploads', () => {
  const cwd = path.join('D:', 'workspace', 'backend');
  assert.equal(resolveUploadRoot({}, cwd), path.join(cwd, 'uploads'));
});

test('resolveUploadRoot 支持使用 UPLOAD_ROOT 指向独立持久化目录', () => {
  const cwd = path.join('D:', 'workspace', 'backend');
  assert.equal(
    resolveUploadRoot({ UPLOAD_ROOT: '/srv/shijia/uploads' }, cwd),
    '/srv/shijia/uploads',
  );
});

test('resolveLogDir 默认 ./logs，支持 LOG_DIR 绝对路径覆盖', () => {
  const cwd = path.join('home', 'app');
  assert.equal(resolveLogDir({}, cwd), path.join(cwd, 'logs'));
  assert.equal(resolveLogDir({ LOG_DIR: '/www/wwwlogs/shijia' }, cwd), '/www/wwwlogs/shijia');
  assert.equal(resolveLogDir({ LOG_DIR: 'my-logs' }, cwd), path.resolve(cwd, 'my-logs'));
});

test('resolveCertDir 默认 ./cert，支持 CERT_DIR 相对/绝对路径', () => {
  const cwd = path.join('home', 'app');
  assert.equal(resolveCertDir({}, cwd), path.join(cwd, 'cert'));
  assert.equal(resolveCertDir({ CERT_DIR: '/etc/shijia-cert' }, cwd), '/etc/shijia-cert');
});

test('resolveBackupDir 默认 ./backup，支持 BACKUP_DIR 覆盖', () => {
  const cwd = path.join('home', 'app');
  assert.equal(resolveBackupDir({}, cwd), path.join(cwd, 'backup'));
  assert.equal(resolveBackupDir({ BACKUP_DIR: '/mnt/backup' }, cwd), '/mnt/backup');
});

test('ensureRuntimeDirs 会创建 uploads/logs/cert/backup 四个目录（不存在时）', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sjyf-runtime-'));
  try {
    const env = {
      UPLOAD_ROOT: path.join(tmpRoot, 'uploads'),
      LOG_DIR: path.join(tmpRoot, 'logs'),
      CERT_DIR: path.join(tmpRoot, 'cert'),
      BACKUP_DIR: path.join(tmpRoot, 'backup'),
    };
    ensureRuntimeDirs(env, tmpRoot);
    var keys = Object.keys(env);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var p = env[k];
      assert.ok(fs.statSync(p).isDirectory(), '目录未创建: ' + p);
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
