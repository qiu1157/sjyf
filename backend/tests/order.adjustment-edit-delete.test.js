const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../dist/modules/order/order.service');
const { OrderStatus } = require('../dist/common/constants/order-status.constants');

function createOrderRepo(initialOrder) {
  let currentOrder = initialOrder ? { ...initialOrder } : null;
  return {
    findOne: async ({ where }) => {
      if (!currentOrder || where.id !== currentOrder.id) {
        return null;
      }
      return { ...currentOrder };
    },
    save: async (payload) => {
      currentOrder = { ...payload };
      return { ...currentOrder };
    },
    getCurrent: () => ({ ...currentOrder }),
  };
}

function createEntityRepo(initialRows = []) {
  let rows = initialRows.map((item) => ({ ...item }));
  const deleted = [];

  return {
    findOne: async ({ where }) => rows.find((item) => Object.keys(where).every((key) => item[key] === where[key])) || null,
    find: async ({ where } = {}) => {
      if (!where) return rows.map((item) => ({ ...item }));
      return rows
        .filter((item) => Object.keys(where).every((key) => item[key] === where[key]))
        .map((item) => ({ ...item }));
    },
    create: (payload) => ({ ...payload }),
    save: async (payload) => {
      const list = Array.isArray(payload) ? payload : [payload];
      const saved = list.map((item) => {
        const next = { ...item };
        const index = rows.findIndex((row) => row.id === next.id);
        if (index >= 0) {
          rows[index] = next;
        } else {
          rows.push(next);
        }
        return { ...next };
      });
      return Array.isArray(payload) ? saved : saved[0];
    },
    delete: async (where) => {
      rows = rows.filter((item) => {
        const matched = Object.keys(where).every((key) => item[key] === where[key]);
        if (matched) {
          deleted.push({ ...item });
        }
        return !matched;
      });
      return { affected: deleted.length };
    },
    getRows: () => rows.map((item) => ({ ...item })),
    getDeleted: () => deleted.map((item) => ({ ...item })),
  };
}

function createService({ order, adjustments = [], materials = [], items = [], leaderId = 9001 }) {
  const orderRepo = createOrderRepo(order);
  const adjustmentRepo = createEntityRepo(adjustments);
  const orderMaterialRepo = createEntityRepo(materials);
  const itemRepo = createEntityRepo(items);
  const materialRepo = createEntityRepo([{ id: 9, name: '除胶剂', status: 1 }]);
  const employeeRepo = createEntityRepo([{ id: leaderId, name: '王领队' }]);
  const historyRecords = [];
  const noopRepo = {
    find: async () => [],
    findOne: async () => null,
    create: (payload) => ({ ...payload }),
    save: async (payload) => payload,
    delete: async () => ({ affected: 0 }),
  };
  const orderHistoryService = {
    record: async (...args) => {
      historyRecords.push(args);
      return args;
    },
  };

  return {
    service: new OrderService(
      orderRepo,
      noopRepo,
      orderMaterialRepo,
      noopRepo,
      adjustmentRepo,
      itemRepo,
      noopRepo,
      materialRepo,
      employeeRepo,
      noopRepo,
      noopRepo,
      orderHistoryService,
      undefined,
    ),
    orderRepo,
    adjustmentRepo,
    orderMaterialRepo,
    historyRecords,
  };
}

test('updateAdjustment 支持同类型修改服务增项并重算尾款留痕', async () => {
  const { service, orderRepo, adjustmentRepo, historyRecords } = createService({
    order: {
      id: 801,
      status: OrderStatus.IN_SERVICE,
      leader_id: 9001,
      total_amount: 388,
      extra_amount: 88,
      final_payment: 88,
    },
    adjustments: [
      { id: 31, order_id: 801, adjust_type: 1, service_item_id: 0, service_name: '窗帘深度清洁', adjust_amount: 88, remark: '现场新增', is_deleted: 0 },
    ],
    items: [{ id: 18, name: '深度保洁', status: 1, is_deleted: 0, leader_selectable: 1 }],
  });

  const result = await service.updateAdjustment(801, 31, 9001, {
    adjust_type: 1,
    service_item_id: 18,
    adjust_amount: 120,
    remark: '改为服务库标准项',
  });

  assert.equal(result.service_item_id, 18);
  assert.equal(result.service_name, '深度保洁');
  assert.equal(Number(orderRepo.getCurrent().extra_amount), 120);
  assert.equal(Number(orderRepo.getCurrent().final_payment), 120);
  assert.equal(adjustmentRepo.getRows()[0].remark, '改为服务库标准项');
  assert.equal(historyRecords.length, 1);
  assert.match(String(historyRecords[0][7] || ''), /修改增项/);
});

test('updateAdjustment 拒绝跨类型修改', async () => {
  const { service } = createService({
    order: {
      id: 802,
      status: OrderStatus.IN_SERVICE,
      leader_id: 9001,
      total_amount: 330,
      extra_amount: 30,
      final_payment: 30,
    },
    adjustments: [
      { id: 41, order_id: 802, adjust_type: 3, material_id: 9, material_name: '除胶剂', material_quantity: 1, adjust_amount: 30, is_deleted: 0 },
    ],
    materials: [
      { id: 51, order_id: 802, material_id: 9, material_name: '除胶剂', quantity: 1, is_extra: 1, adjustment_id: 41 },
    ],
  });

  await assert.rejects(
    () => service.updateAdjustment(802, 41, 9001, { adjust_type: 1, service_name: '窗帘深度清洁', adjust_amount: 66 }),
    /同类型/,
  );
});

test('deleteAdjustment 软删增项并删除对应增补物料且列表不再返回', async () => {
  const { service, orderRepo, adjustmentRepo, orderMaterialRepo, historyRecords } = createService({
    order: {
      id: 803,
      status: OrderStatus.IN_SERVICE,
      leader_id: 9001,
      total_amount: 350,
      extra_amount: 50,
      final_payment: 50,
    },
    adjustments: [
      { id: 61, order_id: 803, adjust_type: 3, material_id: 9, material_name: '除胶剂', material_quantity: 2, adjust_amount: 50, is_deleted: 0 },
    ],
    materials: [
      { id: 71, order_id: 803, material_id: 9, material_name: '除胶剂', quantity: 2, is_extra: 1, adjustment_id: 61 },
    ],
  });

  const deleted = await service.deleteAdjustment(803, 61, 9001);

  assert.equal(deleted.id, 61);
  assert.equal(adjustmentRepo.getRows()[0].is_deleted, 1);
  assert.equal(orderMaterialRepo.getRows().length, 0);
  assert.equal(Number(orderRepo.getCurrent().extra_amount), 0);
  assert.equal(Number(orderRepo.getCurrent().final_payment), 0);

  const list = await service.listAdjustments(803);
  assert.deepEqual(list, []);
  assert.equal(historyRecords.length, 1);
  assert.match(String(historyRecords[0][7] || ''), /删除增项/);
});

test('updateAdjustment 和 deleteAdjustment 仅允许服务中本人领队操作', async () => {
  const { service } = createService({
    order: {
      id: 804,
      status: OrderStatus.PENDING_FINAL,
      leader_id: 9001,
      total_amount: 350,
      extra_amount: 50,
      final_payment: 50,
    },
    adjustments: [
      { id: 81, order_id: 804, adjust_type: 1, service_name: '擦玻璃', adjust_amount: 50, is_deleted: 0 },
    ],
  });

  await assert.rejects(
    () => service.updateAdjustment(804, 81, 9001, { adjust_type: 1, service_name: '擦玻璃', adjust_amount: 60 }),
    /服务中/,
  );
  await assert.rejects(
    () => service.deleteAdjustment(804, 81, 9002),
    /非本人|服务中/,
  );
});
