const test = require('node:test');
const assert = require('node:assert/strict');
const { NotFoundException } = require('@nestjs/common');
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

function createService(order, histories) {
  const orderRepo = createOrderRepo(order);
  const emptyRepo = createEmptyRepo();
  const historyService = {
    record: async () => undefined,
    listByOrder: async (orderId) => histories.filter((item) => item.order_id === orderId),
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
    undefined,
  );
}

test('listAdminHistories 返回订单历史倒序列表', async () => {
  const service = createService(
    { id: 1301, status: 30 },
    [
      {
        id: 2,
        order_id: 1301,
        history_type: 1,
        from_value: '20',
        to_value: '30',
        created_at: '2026-07-27 10:00:00',
        operator_name: '主管A',
      },
      {
        id: 1,
        order_id: 1301,
        history_type: 2,
        from_value: '2026-07-28 AM',
        to_value: '2026-07-29 PM',
        created_at: '2026-07-27 09:00:00',
        operator_name: '主管A',
      },
    ],
  );

  const result = await service.listAdminHistories(1301);

  assert.equal(result.length, 2);
  assert.equal(result[0].id, 2);
  assert.equal(result[1].history_type, 2);
});

test('listAdminHistories 订单不存在时抛错', async () => {
  const service = createService(null, []);

  await assert.rejects(
    () => service.listAdminHistories(1302),
    NotFoundException,
  );
});
