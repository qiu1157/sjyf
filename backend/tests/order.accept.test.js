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

test('accept 将待接单订单更新为待上门并写入历史', async () => {
  const orderRepo = createRepo({
    id: 101,
    status: OrderStatus.PENDING_ACCEPT,
    accept_time: null,
    supervisor_id: null,
  });
  const historyCalls = [];
  const orderHistoryService = {
    record: async (...args) => {
      historyCalls.push(args);
    },
  };
  const service = createService(orderRepo, orderHistoryService);

  const saved = await service.accept(101, 9001);

  assert.equal(saved.status, OrderStatus.PENDING_DOOR);
  assert.equal(saved.supervisor_id, 9001);
  assert.ok(saved.accept_time instanceof Date);
  assert.equal(historyCalls.length, 1);
  assert.deepEqual(historyCalls[0].slice(0, 6), [
    101,
    1,
    String(OrderStatus.PENDING_ACCEPT),
    String(OrderStatus.PENDING_DOOR),
    9001,
    1,
  ]);
  assert.equal(historyCalls[0][7], '主管接单');
});
