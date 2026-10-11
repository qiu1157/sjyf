import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeApiOrigin,
  resolveMiniappApiOrigin,
} from '../src/utils/api-origin-utils.mjs';

test('normalizeApiOrigin 去掉首尾空格和结尾斜杠', () => {
  assert.equal(normalizeApiOrigin(' http://8.8.8.8:3000/ '), 'http://8.8.8.8:3000');
});

test('resolveMiniappApiOrigin 优先使用运行时覆盖地址', () => {
  assert.equal(
    resolveMiniappApiOrigin({
      injectedOrigin: 'http://192.168.0.12:3000',
      runtimeOrigin: 'http://8.138.114.25:3000/',
      fallbackOrigin: 'http://127.0.0.1:3000',
    }),
    'http://8.138.114.25:3000',
  );
});

test('resolveMiniappApiOrigin 在无运行时覆盖时使用构建注入地址', () => {
  assert.equal(
    resolveMiniappApiOrigin({
      injectedOrigin: 'http://192.168.0.12:3000/',
      runtimeOrigin: '',
      fallbackOrigin: 'http://127.0.0.1:3000',
    }),
    'http://192.168.0.12:3000',
  );
});

test('resolveMiniappApiOrigin 在无注入值时回退默认地址', () => {
  assert.equal(
    resolveMiniappApiOrigin({
      injectedOrigin: '',
      runtimeOrigin: '',
      fallbackOrigin: 'http://127.0.0.1:3000/',
    }),
    'http://127.0.0.1:3000',
  );
});
