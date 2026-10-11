const test = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException } = require('@nestjs/common');
const { OrderService } = require('../dist/modules/order/order.service');

function createRepo({ findOneResult = null, findResult = [] } = {}) {
  return {
    findOne: async ({ where } = {}) => {
      if (!findOneResult) return null;
      if (!where) return { ...findOneResult };
      return Object.keys(where).every((key) => findOneResult[key] === where[key]) ? { ...findOneResult } : null;
    },
    find: async ({ where, order } = {}) => {
      let rows = findResult.map((item) => ({ ...item }));
      if (where) {
        rows = rows.filter((item) => Object.keys(where).every((key) => item[key] === where[key]));
      }
      if (order?.id === 'DESC') {
        rows.sort((a, b) => b.id - a.id);
      }
      if (order?.created_at === 'DESC') {
        rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return rows;
    },
    create: (payload) => ({ ...payload }),
    save: async (payload) => payload,
    delete: async () => ({ affected: 0 }),
  };
}

function createService({
  order,
  adjustments = [],
  histories = [],
  photos = [],
}) {
  const orderRepo = createRepo({ findOneResult: order });
  const emptyRepo = createRepo();
  const adjustmentRepo = createRepo({ findResult: adjustments });
  const photoRepo = createRepo({ findResult: photos });
  const historyService = {
    record: async () => undefined,
    listByOrder: async () => histories.map((item) => ({ ...item })),
  };

  return new OrderService(
    orderRepo,
    emptyRepo,
    emptyRepo,
    photoRepo,
    adjustmentRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    historyService,
  );
}

test('userDetail 仅允许查看本人订单且不返回现场照片', async () => {
  const service = createService({
    order: {
      id: 801,
      user_id: 3001,
      order_no: 'SJ20260727001',
      service_name: '深度保洁',
    },
    photos: [
      { id: 1, order_id: 801, photo_url: '/uploads/a.jpg' },
    ],
  });

  await assert.rejects(
    () => service.userDetail(3999, 801),
    BadRequestException,
  );

  const result = await service.userDetail(3001, 801);
  assert.equal(result.order.id, 801);
  assert.equal(result.photos, undefined);
  assert.equal(result.adjustments, undefined);
});

test('listUserAdjustments 仅返回本人订单且过滤已删除增项', async () => {
  const service = createService({
    order: {
      id: 802,
      user_id: 3002,
      order_no: 'SJ20260727002',
    },
    adjustments: [
      { id: 1, order_id: 802, service_name: '擦玻璃', adjust_amount: 30, is_deleted: 0 },
      { id: 2, order_id: 802, service_name: '柜体整理', adjust_amount: 50, is_deleted: 1 },
      { id: 3, order_id: 802, material_name: '除胶剂', adjust_amount: 20, is_deleted: 0 },
    ],
  });

  const result = await service.listUserAdjustments(3002, 802);

  assert.deepEqual(
    result.map((item) => item.id),
    [3, 1],
  );
});

test('userTimeline 仅返回本人订单时间线', async () => {
  const service = createService({
    order: {
      id: 803,
      user_id: 3003,
      created_at: new Date('2026-07-27T08:00:00Z'),
      first_pay_time: new Date('2026-07-27T08:10:00Z'),
      first_payment: 199,
      accept_time: new Date('2026-07-27T09:00:00Z'),
      final_pay_time: null,
      final_payment: 0,
      cancel_time: null,
      cancel_reason: null,
    },
    histories: [],
  });

  const result = await service.userTimeline(3003, 803);

  assert.deepEqual(
    result.map((item) => item.title),
    ['订单创建', '首款已付', '已接单'],
  );
});
