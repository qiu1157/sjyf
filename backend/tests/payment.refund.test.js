const test = require('node:test');
const assert = require('node:assert/strict');
const { PaymentService } = require('../dist/modules/payment/payment.service');

function createOrderRepo(order) {
  return {
    findOne: async ({ where } = {}) => {
      if (!order) return null;
      if (!where) return order;
      return Object.keys(where).every((key) => order[key] === where[key]) ? order : null;
    },
    save: async (payload) => payload,
  };
}

test('refundFirstPayment 在 mock 模式下返回模拟退款结果', async () => {
  const service = new PaymentService(
    createOrderRepo({
      id: 1201,
      order_no: 'SJ20260727012',
      first_payment: 299,
    }),
    { record: async () => undefined },
  );

  const result = await service.refundFirstPayment(1201, '用户取消');

  assert.equal(result.success, true);
  assert.equal(result.refundMode, 'mock');
  assert.equal(typeof result.refundNo, 'string');
  assert.equal(result.amount, 299);
});

test('refundFirstPayment 在 real 模式下走微信退款分支', async () => {
  const service = new PaymentService(
    createOrderRepo({
      id: 1202,
      order_no: 'SJ20260727013',
      first_payment: 199,
    }),
    { record: async () => undefined },
  );

  service.realRefund = async (order, reason) => ({
    success: true,
    refundMode: 'real',
    refundNo: `RF-${order.id}`,
    amount: Number(order.first_payment),
    reason,
  });

  const originalPayMode = process.env.PAY_MODE;
  process.env.PAY_MODE = 'real';

  try {
    const result = await service.refundFirstPayment(1202, '主管审核通过');
    assert.equal(result.success, true);
    assert.equal(result.refundMode, 'real');
    assert.equal(result.refundNo, 'RF-1202');
    assert.equal(result.amount, 199);
  } finally {
    process.env.PAY_MODE = originalPayMode;
  }
});
