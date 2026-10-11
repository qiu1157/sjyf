const test = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException } = require('@nestjs/common');
const { OrderService } = require('../dist/modules/order/order.service');

function createOrderRepo(order) {
  return {
    findOne: async ({ where } = {}) => {
      if (!order) return null;
      if (!where) return { ...order };
      return Object.keys(where).every((key) => order[key] === where[key]) ? { ...order } : null;
    },
    save: async (payload) => ({ ...payload }),
    createQueryBuilder: () => ({
      where() { return this; },
      andWhere() { return this; },
      orderBy() { return this; },
      skip() { return this; },
      take() { return this; },
      getManyAndCount: async () => [[], 0],
    }),
  };
}

function createEmptyRepo() {
  return {
    findOne: async () => null,
    find: async () => [],
    save: async (payload) => payload,
    create: (payload) => payload,
  };
}

function createService(order, records, paymentService) {
  const orderRepo = createOrderRepo(order);
  const emptyRepo = createEmptyRepo();
  const historyService = {
    record: async (...args) => {
      records.push(args);
    },
    listByOrder: async () => [],
  };

  return new OrderService(
    orderRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    historyService,
    paymentService,
  );
}

test('cancelAudit 审核通过后执行退款并关闭订单', async () => {
  const records = [];
  const paymentCalls = [];
  const service = createService({
    id: 1101,
    order_no: 'SJ20260727001',
    status: 91,
    prev_status: 30,
    first_payment: 299,
    refund_amount: 0,
  }, records, {
    refundFirstPayment: async (...args) => {
      paymentCalls.push(args);
      return { success: true, refundMode: 'mock', refundNo: 'RF1101' };
    },
  });

  const result = await service.cancelAudit(1101, 9001, { approved: true, remark: '同意退款' });

  assert.equal(result.status, 90);
  assert.equal(result.refund_amount, 299);
  assert.equal(result.cancel_audit_remark, '同意退款');
  assert.ok(result.cancel_time instanceof Date);
  assert.ok(result.cancel_audit_time instanceof Date);
  assert.deepEqual(paymentCalls[0], [1101, '同意退款']);
  assert.deepEqual(records[0], [
    1101,
    1,
    '91',
    '90',
    9001,
    3,
    null,
    '审核通过，退款¥299',
  ]);
});

test('cancelAudit 审核拒绝后恢复原状态', async () => {
  const records = [];
  const service = createService({
    id: 1102,
    status: 91,
    prev_status: 20,
    first_payment: 199,
    refund_amount: 0,
  }, records, {
    refundFirstPayment: async () => {
      throw new Error('不应调用退款');
    },
  });

  const result = await service.cancelAudit(1102, 9002, { approved: false, remark: '信息已确认，不能取消' });

  assert.equal(result.status, 20);
  assert.equal(result.cancel_audit_remark, '信息已确认，不能取消');
  assert.ok(result.cancel_audit_time instanceof Date);
  assert.deepEqual(records[0], [
    1102,
    1,
    '91',
    '20',
    9002,
    3,
    null,
    '审核拒绝：信息已确认，不能取消',
  ]);
});

test('cancelAudit 拒绝审核非待取消订单', async () => {
  const service = createService({
    id: 1103,
    status: 30,
    prev_status: 20,
    first_payment: 199,
  }, [], {
    refundFirstPayment: async () => ({ success: true }),
  });

  await assert.rejects(
    () => service.cancelAudit(1103, 9002, { approved: true, remark: '同意退款' }),
    BadRequestException,
  );
});
