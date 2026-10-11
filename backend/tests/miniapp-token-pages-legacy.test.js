const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const files = [
  'miniapp/src/pages/review/review.vue',
  'miniapp/src/pages/my/my.vue',
];

function read(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('低优先页面不再保留裸十六进制色值', () => {
  files.forEach((file) => {
    const source = read(file);
    assert.equal(/#[0-9A-Fa-f]{3,8}/.test(source), false, `${file} 仍包含十六进制色值`);
  });
});

test('低优先页面不再保留裸 rgba 色值', () => {
  files.forEach((file) => {
    const source = read(file);
    assert.equal(source.includes('rgba('), false, `${file} 仍包含裸 rgba 色值`);
  });
});
