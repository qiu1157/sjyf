const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function hasTokenReference(source, token) {
  const escaped = token.replace(/\$/g, '\\$');
  return new RegExp(`${escaped}(?![-\\w])`).test(source);
}

test('variables.scss 提供统一的设计令牌基座', () => {
  const source = read('miniapp/src/styles/variables.scss');
  const requiredTokens = [
    '$neutral-0:',
    '$neutral-50:',
    '$neutral-100:',
    '$neutral-200:',
    '$neutral-500:',
    '$neutral-700:',
    '$neutral-800:',
    '$neutral-900:',
    '$state-success:',
    '$state-warning:',
    '$state-error:',
    '$state-info:',
    '$surface-page:',
    '$surface-card:',
    '$text-primary:',
    '$text-body:',
    '$text-secondary:',
    '$border-default:',
    '$overlay-mask:',
  ];

  requiredTokens.forEach((token) => {
    assert.equal(source.includes(token), true, `variables.scss 缺少基座令牌: ${token}`);
  });
});

test('common.scss 改为消费新的语义化令牌', () => {
  const source = read('miniapp/src/styles/common.scss');
  const requiredTokens = [
    '$surface-page',
    '$surface-card',
    '$text-primary',
    '$text-secondary',
    '$border-default',
    '$overlay-mask',
  ];
  const legacyTokens = [
    '$bg-cream',
    '$bg-paper',
    '$line-color',
    '$text-dark',
    '$text-muted',
    '$bg-paper-overlay',
  ];

  requiredTokens.forEach((token) => {
    assert.equal(source.includes(token), true, `common.scss 未消费新令牌: ${token}`);
  });

  legacyTokens.forEach((token) => {
    assert.equal(hasTokenReference(source, token), false, `common.scss 仍引用旧令牌: ${token}`);
  });
});
