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

function createService(order, records) {
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
  );
}

test('userCancel 待支付订单直接取消并写历史', async () => {
  const records = [];
  const service = createService({
    id: 1001,
    user_id: 3001,
    status: 10,
    cancel_time: null,
    cancel_reason: null,
  }, records);

  const result = await service.userCancel(3001, 1001, '时间冲突');

  assert.equal(result.status, 90);
  assert.equal(result.cancel_reason, '时间冲突');
  assert.ok(result.cancel_time instanceof Date);
  assert.deepEqual(records[0], [
    1001,
    1,
    '10',
    '90',
    3001,
    0,
    null,
    '时间冲突',
  ]);
});

test('userCancel 已支付未服务订单进入待取消审核并保留原状态', async () => {
  const records = [];
  const service = createService({
    id: 1002,
    user_id: 3001,
    status: 30,
    prev_status: null,
    cancel_apply_time: null,
    cancel_reason: null,
  }, records);

  const result = await service.userCancel(3001, 1002, '下错单');

  assert.equal(result.status, 91);
  assert.equal(result.prev_status, 30);
  assert.equal(result.cancel_reason, '下错单');
  assert.ok(result.cancel_apply_time instanceof Date);
  assert.deepEqual(records[0], [
    1002,
    1,
    '30',
    '91',
    3001,
    0,
    null,
    '下错单',
  ]);
});

test('userCancel 拒绝取消服务中订单', async () => {
  const service = createService({
    id: 1003,
    user_id: 3001,
    status: 40,
  }, []);

  await assert.rejects(
    () => service.userCancel(3001, 1003, '不想要了'),
    BadRequestException,
  );
});

test('userCancel 拒绝取消非本人订单', async () => {
  const service = createService({
    id: 1004,
    user_id: 3002,
    status: 20,
  }, []);

  await assert.rejects(
    () => service.userCancel(3001, 1004, '其它'),
    BadRequestException,
  );
});
