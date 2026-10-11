import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrderDetailBackAction,
  getOrderPageBackAction,
} from '../src/pages/order/order-page-utils.mjs';

test('订单页在有页面栈时优先返回上一页', () => {
  assert.deepEqual(getOrderPageBackAction(2), {
    type: 'navigateBack',
    delta: 1,
  });
});

test('订单页在无页面栈时回到我的页面', () => {
  assert.deepEqual(getOrderPageBackAction(1), {
    type: 'switchTab',
    url: '/pages/mine/mine',
  });
});

test('订单详情页在有页面栈时优先返回上一页', () => {
  assert.deepEqual(getOrderDetailBackAction(2), {
    type: 'navigateBack',
    delta: 1,
  });
});

test('订单详情页在无页面栈时回到订单页', () => {
  assert.deepEqual(getOrderDetailBackAction(1), {
    type: 'switchTab',
    url: '/pages/order/order',
  });
});
