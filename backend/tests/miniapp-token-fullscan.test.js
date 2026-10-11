const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const miniappSrcRoot = path.join(workspaceRoot, 'miniapp', 'src');
const allowFiles = new Set(['styles/variables.scss']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (/\.(vue|scss|css)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function read(relativePath) {
  return fs.readFileSync(path.join(miniappSrcRoot, relativePath), 'utf8');
}

function listBusinessFiles() {
  return walk(miniappSrcRoot)
    .map((file) => path.relative(miniappSrcRoot, file).replace(/\\/g, '/'))
    .filter((file) => !allowFiles.has(file));
}

test('miniapp/src 全量扫描时仅 variables.scss 可以保留十六进制色值', () => {
  listBusinessFiles().forEach((file) => {
    const source = read(file);
    assert.equal(/#[0-9A-Fa-f]{3,8}/.test(source), false, `${file} 仍包含十六进制色值`);
  });
});

test('miniapp/src 全量扫描时仅 variables.scss 可以保留裸 rgba 色值', () => {
  listBusinessFiles().forEach((file) => {
    const source = read(file);
    assert.equal(source.includes('rgba('), false, `${file} 仍包含裸 rgba 色值`);
  });
});
