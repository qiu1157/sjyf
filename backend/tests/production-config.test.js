const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(backendRoot, 'package.json');
const envExamplePath = path.join(backendRoot, '.env.production.example');
const appModulePath = path.join(backendRoot, 'src', 'app.module.ts');
const deployScriptPath = path.resolve(backendRoot, '..', 'scripts', 'deploy', 'deploy-code.sh');

function readPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function readEnvExample() {
  return fs.readFileSync(envExamplePath, 'utf8');
}

function readAppModule() {
  return fs.readFileSync(appModulePath, 'utf8');
}

function readDeployScript() {
  return fs.readFileSync(deployScriptPath, 'utf8');
}

test('生产依赖中显式声明 mysql2 驱动', () => {
  const packageJson = readPackageJson();
  assert.equal(typeof packageJson.dependencies.mysql2, 'string');
});

test('生产环境模板包含关键数据库与运行变量', () => {
  const envExample = readEnvExample();
  const requiredKeys = [
    'NODE_ENV=production',
    'PORT=3000',
    'DB_TYPE=mysql',
    'DB_HOST=',
    'DB_PORT=3306',
    'DB_USER=',
    'DB_PASSWORD=',
    'DB_NAME=',
    'DB_SYNC=false',
    'ENABLE_SEED=false',
    'JWT_SECRET=',
    'PAY_MODE=',
  ];

  for (const key of requiredKeys) {
    assert.match(envExample, new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'));
  }
});

test('应用启动时优先加载环境对应的 env 文件，并支持 ENV_FILE_PATH 最高优先级覆盖', () => {
  const appModule = readAppModule();
  // 环境加载顺序由独立函数 buildEnvFilePaths 统一管理
  assert.match(appModule, /function buildEnvFilePaths\(/);
  assert.match(appModule, /process\.env\.ENV_FILE_PATH/);
  assert.match(appModule, /envFilePath:\s*buildEnvFilePaths\(\)/);
  // 仍然保留旧的 NODE_ENV 加载顺序兼容基线（先 .env 再 .env.{NODE_ENV}）
  assert.match(appModule, /paths\.push\(`\.env\.\$\{nodeEnv\}`\)/);
  assert.match(appModule, /const paths:\s*string\[\]\s*=\s*\['\.env'\]/);
});

test('启动入口存在关键环境变量自检与健康端点特征', () => {
  const mainPath = path.join(backendRoot, 'src', 'main.ts');
  const mainSrc = fs.readFileSync(mainPath, 'utf8');
  // Task 1：缺失关键 env 诊断提示
  assert.match(mainSrc, /Missing Env:/);
  assert.match(mainSrc, /ENV_FILE_PATH/);
  // Task 2：健康端点存在
  assert.match(mainSrc, /\/health/);
  assert.match(mainSrc, /uptimeSec/);
  // Task 3：运行时目录自动创建
  assert.match(mainSrc, /ensureRuntimeDirs\(/);
});

test('部署脚本会校验生产环境文件并用 update-env 重启 PM2', () => {
  const deployScript = readDeployScript();
  assert.match(deployScript, /require_file "\$BACKEND_DIR\/\.env\.production"/);
  assert.match(deployScript, /pm2 restart "\$BACKEND_PM2_NAME" --update-env/);
});
