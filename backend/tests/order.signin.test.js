const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../dist/modules/order/order.service');
const { OrderStatus } = require('../dist/common/constants/order-status.constants');

function createRepo(initialOrder) {
  let currentOrder = initialOrder;

  return {
    findOne: async ({ where }) => {
      if (!currentOrder || where.id !== currentOrder.id) {
        return null;
      }
      return { ...currentOrder };
    },
    save: async (order) => {
      currentOrder = { ...order };
      return { ...currentOrder };
    },
  };
}

function createService(orderRepo, orderHistoryService) {
  const noopRepo = {};
  return new OrderService(
    orderRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    orderHistoryService,
  );
}

test('signIn 将待上门订单更新为服务中并写入历史', async () => {
  const orderRepo = createRepo({
    id: 501,
    status: OrderStatus.PENDING_DOOR,
    leader_id: 9001,
    sign_in_time: null,
  });
  const historyCalls = [];
  const orderHistoryService = {
    record: async (...args) => {
      historyCalls.push(args);
    },
  };
  const service = createService(orderRepo, orderHistoryService);

  const saved = await service.signIn(501, 9001);

  assert.equal(saved.status, OrderStatus.IN_SERVICE);
  assert.ok(saved.sign_in_time instanceof Date);
  assert.equal(historyCalls.length, 1);
  assert.deepEqual(historyCalls[0].slice(0, 6), [
    501,
    1,
    String(OrderStatus.PENDING_DOOR),
    String(OrderStatus.IN_SERVICE),
    9001,
    4,
  ]);
  assert.equal(historyCalls[0][7], '领队签到');
});

test('signIn 拒绝重复签到', async () => {
  const orderRepo = createRepo({
    id: 502,
    status: OrderStatus.IN_SERVICE,
    leader_id: 9001,
    sign_in_time: new Date(),
  });
  const service = createService(orderRepo, { record: async () => undefined });

  await assert.rejects(
    () => service.signIn(502, 9001),
    /签到/,
  );
});
