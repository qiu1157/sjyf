import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANCEL_REASON_OPTIONS,
  buildAdjustmentDisplayList,
  buildFeeSummary,
  getCancelSubmitMessage,
  getDisplayAddress,
  shouldShowCancelButton,
  shouldShowFinalPayButton,
} from '../src/pages/order-detail/order-detail-utils.mjs';

test('费用明细会汇总服务价、首款、增项和尾款', () => {
  assert.deepEqual(
    buildFeeSummary({
      service_price: 299,
      first_payment: 299,
      extra_amount: 88,
      final_payment: 88,
    }),
    {
      service_price: '299.00',
      first_payment: '299.00',
      extra_amount: '88.00',
      final_payment: '88.00',
    },
  );
});

test('地址优先展示快照中的 full_address', () => {
  assert.equal(
    getDisplayAddress({
      full_address: '湖南省长沙市浏阳市集里街道某小区1栋101',
      detail: '备用地址',
    }),
    '湖南省长沙市浏阳市集里街道某小区1栋101',
  );
});

test('增项记录展示会根据服务和物料自动生成内容文案', () => {
  assert.deepEqual(
    buildAdjustmentDisplayList([
      { id: 1, adjust_type: 1, service_name: '窗帘深度清洁', adjust_amount: 88, created_at: '2026-07-27 10:00:00' },
      { id: 2, adjust_type: 3, material_name: '除胶剂', material_quantity: 2, adjust_amount: 30, created_at: '2026-07-27 11:00:00' },
    ]),
    [
      { id: 1, title: '增项服务：窗帘深度清洁', amount: '88.00', created_at: '2026-07-27 10:00:00' },
      { id: 2, title: '增补物料：除胶剂 x2', amount: '30.00', created_at: '2026-07-27 11:00:00' },
    ],
  );
});

test('仅待付尾款且尾款大于 0 的订单显示支付尾款按钮', () => {
  assert.equal(
    shouldShowFinalPayButton({ status: 60, extra_amount: 88 }),
    true,
  );
  assert.equal(
    shouldShowFinalPayButton({ status: 60, extra_amount: 0 }),
    false,
  );
  assert.equal(
    shouldShowFinalPayButton({ status: 80, extra_amount: 88 }),
    false,
  );
});

test('取消订单固定原因选项符合 US-U06 口径', () => {
  assert.deepEqual(
    CANCEL_REASON_OPTIONS,
    ['时间冲突', '下错单', '不想要了', '其它'],
  );
});

test('仅待支付、待接单、待上门状态显示取消按钮', () => {
  assert.equal(shouldShowCancelButton({ status: 10 }), true);
  assert.equal(shouldShowCancelButton({ status: 20 }), true);
  assert.equal(shouldShowCancelButton({ status: 30 }), true);
  assert.equal(shouldShowCancelButton({ status: 40 }), false);
  assert.equal(shouldShowCancelButton({ status: 91 }), false);
  assert.equal(shouldShowCancelButton({ status: 90 }), false);
});

test('取消成功提示会按状态区分直接取消和待审核', () => {
  assert.equal(getCancelSubmitMessage(10), '订单已取消');
  assert.equal(getCancelSubmitMessage(20), '已提交取消申请，等待主管审核');
  assert.equal(getCancelSubmitMessage(30), '已提交取消申请，等待主管审核');
});
