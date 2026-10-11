const test = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException, NotFoundException } = require('@nestjs/common');
const { OrderService } = require('../dist/modules/order/order.service');
const { OrderStatus } = require('../dist/common/constants/order-status.constants');

function createOrderRepo(initialOrder) {
  let currentOrder = { ...initialOrder };

  return {
    findOne: async ({ where }) => {
      if (!currentOrder || where.id !== currentOrder.id) {
        return null;
      }
      if (where.leader_id !== undefined && where.leader_id !== currentOrder.leader_id) {
        return null;
      }
      return { ...currentOrder };
    },
    save: async (order) => {
      currentOrder = { ...order };
      return { ...currentOrder };
    },
    getCurrent: () => ({ ...currentOrder }),
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

test('acceptance 在无尾款时保存双工时并直接完成订单', async () => {
  const orderRepo = createOrderRepo({
    id: 201,
    status: OrderStatus.IN_SERVICE,
    leader_id: 7001,
    extra_amount: 0,
    final_payment: 0,
    plan_hours: 3,
    actual_hours: 0,
    plan_actual_hours: 0,
    extra_actual_hours: 0,
    complete_time: null,
  });
  const historyCalls = [];
  const service = createService(orderRepo, {
    record: async (...args) => historyCalls.push(args),
  });

  const saved = await service.acceptance(201, 7001, {
    plan_actual_hours: 2.5,
    extra_actual_hours: 1,
  });

  assert.equal(saved.status, OrderStatus.COMPLETED);
  assert.equal(Number(saved.plan_actual_hours), 2.5);
  assert.equal(Number(saved.extra_actual_hours), 1);
  assert.equal(Number(saved.actual_hours), 3.5);
  assert.ok(saved.complete_time instanceof Date);
  assert.equal(historyCalls.length, 1);
  assert.deepEqual(historyCalls[0].slice(0, 6), [
    201,
    1,
    String(OrderStatus.IN_SERVICE),
    String(OrderStatus.COMPLETED),
    7001,
    4,
  ]);
});

test('acceptance 在有尾款时流转到待付尾款', async () => {
  const orderRepo = createOrderRepo({
    id: 202,
    status: OrderStatus.IN_SERVICE,
    leader_id: 7002,
    extra_amount: 88,
    final_payment: 0,
    actual_hours: 0,
    plan_actual_hours: 0,
    extra_actual_hours: 0,
    complete_time: null,
  });
  const service = createService(orderRepo, {
    record: async () => {},
  });

  const saved = await service.acceptance(202, 7002, {
    plan_actual_hours: 2,
    extra_actual_hours: 0.5,
  });

  assert.equal(saved.status, OrderStatus.PENDING_FINAL);
  assert.equal(Number(saved.final_payment), 88);
  assert.equal(Number(saved.actual_hours), 2.5);
  assert.equal(saved.complete_time, null);
});

test('acceptance 缺少双工时时拒绝提交', async () => {
  const orderRepo = createOrderRepo({
    id: 203,
    status: OrderStatus.IN_SERVICE,
    leader_id: 7003,
    extra_amount: 0,
    actual_hours: 0,
    plan_actual_hours: 0,
    extra_actual_hours: 0,
  });
  const service = createService(orderRepo, {
    record: async () => {},
  });

  await assert.rejects(
    service.acceptance(203, 7003, {
      plan_actual_hours: '',
      extra_actual_hours: 1,
    }),
    BadRequestException,
  );
});

test('acceptance 仅允许当前领队提交', async () => {
  const orderRepo = createOrderRepo({
    id: 204,
    status: OrderStatus.IN_SERVICE,
    leader_id: 7004,
    extra_amount: 0,
    actual_hours: 0,
    plan_actual_hours: 0,
    extra_actual_hours: 0,
  });
  const service = createService(orderRepo, {
    record: async () => {},
  });

  await assert.rejects(
    service.acceptance(204, 7999, {
      plan_actual_hours: 1,
      extra_actual_hours: 0,
    }),
    NotFoundException,
  );
});
