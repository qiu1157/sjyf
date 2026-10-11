const test = require('node:test');
const assert = require('node:assert/strict');
const { PaymentService } = require('../dist/src/modules/payment/payment.service');

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

test('payFirst 在 mock 支付成功后写入 10 到 20 的状态历史', async () => {
  const records = [];
  const order = {
    id: 701,
    user_id: 2001,
    status: 10,
    first_payment: 188,
    first_pay_time: null,
  };
  const service = new PaymentService(
    createOrderRepo(order),
    {
      record: async (...args) => {
        records.push(args);
      },
    },
  );

  const result = await service.payFirst(701);

  assert.equal(result.success, true);
  assert.equal(result.order.status, 20);
  assert.ok(result.order.first_pay_time instanceof Date);
  assert.deepEqual(records[0], [
    701,
    1,
    '10',
    '20',
    2001,
    0,
    null,
    '用户支付首付款 ¥188',
  ]);
});
