const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

const STATUS_GUARD_CASES = [
  {
    file: 'backend/src/modules/order/order.service.ts',
    patterns: [
      'status !== 20',
      'order.status = 30',
      'order.status === 20',
      'prevStatus === 20',
      'status !== 30',
      'order.status = 40',
      'status >= 40',
      'order.status = 90',
    ],
  },
  {
    file: 'backend/src/modules/dashboard/dashboard.service.ts',
    patterns: [
      'status === 50',
      'status === 60',
      'status === 80',
      'status !== 90',
      'status: 20',
      'status: 50',
      'status: 80',
    ],
  },
  {
    file: 'backend/src/modules/user-admin/user-admin.service.ts',
    patterns: [
      'status: 30',
      'status: 40',
      'status: 60',
    ],
  },
  {
    file: 'backend/src/modules/seed/seed.module.ts',
    patterns: [
      'status: 20',
      'status: 30',
      'return r < 0.85 ? 80 : 90',
      'return 60;',
      'return 40;',
      'return 30;',
      'return 20;',
      'status >= 20',
      'status >= 30',
      'status >= 40',
      'status >= 60',
      'status >= 80',
      'status === 90',
    ],
  },
  {
    file: 'miniapp/src/pages/order/order-list-utils.mjs',
    patterns: [
      "50: '待验收'",
      "70: '待评价'",
    ],
  },
  {
    file: 'miniapp/src/pages/order-list/order-list.vue',
    patterns: [
      "{ value: 70, label: '待评价' }",
      "50:'待验收'",
      "70:'待评价'",
    ],
  },
];

const COLOR_GUARD_CASES = [
  {
    file: 'miniapp/src/styles/common.scss',
    patterns: [
      '#f5e8d4',
      '#fff3df',
      '#fff2df',
      '#eaf7ec',
      '#fae9e5',
      '#f1e1ce',
      '#cfb28e',
      '#fffaf1',
      '#eadcc9',
      '#e8d2b5',
      '#fff4e2',
      'rgba(255, 255, 255, 0.18)',
      'rgba(255, 253, 248, 0.95)',
    ],
  },
  {
    file: 'miniapp/src/pages/order/order.vue',
    patterns: ['#fff', '#fff3e6', '#d46b08', '#efe2d5', '#e8f7ec', '#389e0d', '#f2f2f2', '#666'],
  },
  {
    file: 'miniapp/src/pages/order-detail/order-detail.vue',
    patterns: ['#fff', '#333'],
  },
  {
    file: 'miniapp/src/pages/leader/order.vue',
    patterns: ['#f4e5d0', '#f2efe9', '#1f8f55', '#d96b16', '#fff3e8', '#f7efe4', 'rgba(52, 40, 32, 0.42)', '#fff'],
  },
  {
    file: 'miniapp/src/pages/leader/photo.vue',
    patterns: ['rgba(52, 40, 32, 0.7)', '#fff'],
  },
  {
    file: 'miniapp/src/pages/leader/workbench.vue',
    patterns: ['#fff', 'rgba(73, 48, 28, 0.08)'],
  },
  {
    file: 'miniapp/src/pages/leader/acceptance.vue',
    patterns: ['#342820', '#333', '#f0ebe6', '#eadfce', '#fffaf5', '#8c6b55', '#f5222d', '#52c41a'],
  },
  {
    file: 'miniapp/src/App.vue',
    patterns: ['#f5f5f5', '#fff'],
  },
  {
    file: 'miniapp/src/components/TabBar.vue',
    patterns: ['rgba(255, 253, 248, 0.95)'],
  },
  {
    file: 'miniapp/src/pages/order-list/order-list.vue',
    patterns: ['#fff', '#666', '#f5f5f5', '#C2956E', '#999', '#333'],
  },
];

function readFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, '..', relativePath), 'utf8');
}

test('订单状态相关源码不再保留裸状态值', () => {
  STATUS_GUARD_CASES.forEach(({ file, patterns }) => {
    const source = readFile(file);
    patterns.forEach((pattern) => {
      assert.equal(
        source.includes(pattern),
        false,
        `${file} 仍包含裸状态值片段: ${pattern}`,
      );
    });
  });
});

test('miniapp 订单链路样式改为复用设计令牌', () => {
  COLOR_GUARD_CASES.forEach(({ file, patterns }) => {
    const source = readFile(file);
    patterns.forEach((pattern) => {
      assert.equal(
        source.includes(pattern),
        false,
        `${file} 仍包含裸色值片段: ${pattern}`,
      );
    });
  });
});
