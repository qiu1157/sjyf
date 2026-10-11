const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const files = [
  'miniapp/src/pages/address/address.vue',
  'miniapp/src/pages/address/edit.vue',
  'miniapp/src/pages/book/book.vue',
  'miniapp/src/pages/confirm/confirm.vue',
  'miniapp/src/pages/detail/detail.vue',
  'miniapp/src/pages/pay-success/pay-success.vue',
];

function read(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('中优先页面不再保留裸十六进制色值', () => {
  files.forEach((file) => {
    const source = read(file);
    assert.equal(/#[0-9A-Fa-f]{3,8}/.test(source), false, `${file} 仍包含十六进制色值`);
  });
});

test('中优先页面不再保留裸 rgba 色值', () => {
  files.forEach((file) => {
    const source = read(file);
    assert.equal(source.includes('rgba('), false, `${file} 仍包含裸 rgba 色值`);
  });
});
