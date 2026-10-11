const test = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException } = require('@nestjs/common');
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

test('payFinalByUser 仅允许本人支付待付尾款订单并写入历史', async () => {
  const records = [];
  const order = {
    id: 901,
    user_id: 3001,
    status: 60,
    final_payment: 88,
    final_pay_time: null,
    complete_time: null,
  };
  const service = new PaymentService(
    createOrderRepo(order),
    {
      record: async (...args) => {
        records.push(args);
      },
    },
  );

  const result = await service.payFinalByUser(3001, 901);

  assert.equal(result.success, true);
  assert.equal(result.order.status, 80);
  assert.ok(result.order.final_pay_time instanceof Date);
  assert.ok(result.order.complete_time instanceof Date);
  assert.deepEqual(records[0], [
    901,
    1,
    '60',
    '80',
    3001,
    0,
    null,
    '用户支付尾款 ¥88',
  ]);
});

test('payFinalByUser 拒绝支付非本人订单', async () => {
  const service = new PaymentService(
    createOrderRepo({
      id: 902,
      user_id: 3002,
      status: 60,
      final_payment: 66,
    }),
    {
      record: async () => undefined,
    },
  );

  await assert.rejects(
    () => service.payFinalByUser(3001, 902),
    BadRequestException,
  );
});
