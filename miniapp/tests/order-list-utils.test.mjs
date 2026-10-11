import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_TABS,
  buildOrderQuery,
  getOrderStatusText,
  getOrderStatusTagType,
} from '../src/pages/order/order-list-utils.mjs';

test('订单 Tab 定义符合 US-U04 五分组', () => {
  assert.deepEqual(
    ORDER_TABS.map((item) => item.key),
    ['in_service', 'pending_final', 'completed', 'cancelled', 'all'],
  );
});

test('buildOrderQuery 会把 tab 转成接口查询参数', () => {
  assert.deepEqual(buildOrderQuery('in_service'), { tab: 'in_service' });
  assert.deepEqual(buildOrderQuery('cancelled'), { tab: 'cancelled' });
  assert.deepEqual(buildOrderQuery('all'), {});
});

test('91 状态展示待取消审核中，90 展示已取消', () => {
  assert.equal(getOrderStatusText(91), '待取消审核中');
  assert.equal(getOrderStatusText(90), '已取消');
});

test('状态标签类型可区分支付中、服务中和完成态', () => {
  assert.equal(getOrderStatusTagType(10), 'warning');
  assert.equal(getOrderStatusTagType(40), 'primary');
  assert.equal(getOrderStatusTagType(80), 'success');
  assert.equal(getOrderStatusTagType(90), 'default');
});
