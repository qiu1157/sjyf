const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabaseOptions } = require('../dist/config/database.config');

test('MySQL 配置默认关闭自动同步和日志', () => {
  const config = createDatabaseOptions({
    DB_TYPE: 'mysql',
    DB_HOST: '127.0.0.1',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_PASSWORD: 'secret',
    DB_NAME: 'shijia_youfang',
  });

  assert.equal(config.type, 'mysql');
  assert.equal(config.port, 3306);
  assert.equal(config.synchronize, false);
  assert.equal(config.logging, false);
});

test('MySQL 配置允许通过环境变量显式开启同步和日志', () => {
  const config = createDatabaseOptions({
    DB_TYPE: 'mysql',
    DB_HOST: '127.0.0.1',
    DB_PORT: '3307',
    DB_USER: 'root',
    DB_PASSWORD: 'secret',
    DB_NAME: 'shijia_youfang',
    DB_SYNC: 'true',
    DB_LOGGING: 'true',
  });

  assert.equal(config.port, 3307);
  assert.equal(config.synchronize, true);
  assert.equal(config.logging, true);
});

test('SQLite 配置保留开发态默认值', () => {
  const config = createDatabaseOptions({
    DB_DATABASE: './custom.db',
  });

  assert.equal(config.type, 'sqljs');
  assert.equal(config.location, './custom.db');
  assert.equal(config.autoSave, true);
  assert.equal(config.synchronize, true);
  assert.equal(config.logging, false);
});
