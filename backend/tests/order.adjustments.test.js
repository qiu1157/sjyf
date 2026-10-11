const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../dist/modules/order/order.service');
const { OrderStatus } = require('../dist/common/constants/order-status.constants');

function createOrderRepo(order) {
  let currentOrder = order ? { ...order } : null;
  const saveCalls = [];

  return {
    findOne: async ({ where }) => {
      if (!currentOrder || where.id !== currentOrder.id) {
        return null;
      }
      return { ...currentOrder };
    },
    save: async (payload) => {
      currentOrder = { ...payload };
      saveCalls.push({ ...payload });
      return { ...currentOrder };
    },
    getCurrent: () => (currentOrder ? { ...currentOrder } : null),
    getSaveCalls: () => saveCalls.map((item) => ({ ...item })),
  };
}

function createEntityRepo(initialRows = []) {
  let rows = initialRows.map((item) => ({ ...item }));
  const saveCalls = [];

  return {
    findOne: async ({ where }) => rows.find((item) => Object.keys(where).every((key) => item[key] === where[key])) || null,
    find: async ({ where } = {}) => {
      if (!where) return rows.map((item) => ({ ...item }));
      return rows.filter((item) => Object.keys(where).every((key) => item[key] === where[key])).map((item) => ({ ...item }));
    },
    create: (payload) => ({ ...payload }),
    save: async (payload) => {
      const next = {
        id: payload.id || rows.length + saveCalls.length + 1,
        ...payload,
      };
      saveCalls.push({ ...next });
      rows.push({ ...next });
      return { ...next };
    },
    getSaveCalls: () => saveCalls.map((item) => ({ ...item })),
  };
}

function createService({ orderRepo, adjustmentRepo, orderMaterialRepo, itemRepo, materialRepo, employeeRepo }) {
  const noopRepo = {
    find: async () => [],
    findOne: async () => null,
    create: (payload) => ({ ...payload }),
    save: async (payload) => payload,
    delete: async () => ({ affected: 0 }),
    update: async () => ({ affected: 0 }),
  };
  const orderHistoryService = { record: async () => undefined };

  return new OrderService(
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
  );
}

test('addAdjustment 支持自定义服务并累计尾款', async () => {
  const orderRepo = createOrderRepo({
    id: 701,
    status: OrderStatus.IN_SERVICE,
    leader_id: 9001,
    total_amount: 300,
    extra_amount: 0,
    final_payment: 0,
  });
  const adjustmentRepo = createEntityRepo();
  const orderMaterialRepo = createEntityRepo();
  const itemRepo = createEntityRepo();
  const materialRepo = createEntityRepo();
  const employeeRepo = createEntityRepo([{ id: 9001, name: '王领队' }]);
  const service = createService({ orderRepo, adjustmentRepo, orderMaterialRepo, itemRepo, materialRepo, employeeRepo });

  const saved = await service.addAdjustment(701, 9001, {
    adjust_type: 1,
    service_name: '窗帘深度清洁',
    adjust_amount: 88,
    remark: '现场新增',
  });

  assert.equal(saved.service_name, '窗帘深度清洁');
  assert.equal(saved.operator_name, '王领队');
  assert.equal(Number(orderRepo.getCurrent().extra_amount), 88);
  assert.equal(Number(orderRepo.getCurrent().final_payment), 88);
});

test('addAdjustment 拒绝非服务中订单录入', async () => {
  const service = createService({
    orderRepo: createOrderRepo({
      id: 702,
      status: OrderStatus.PENDING_DOOR,
      leader_id: 9001,
      total_amount: 300,
      extra_amount: 0,
      final_payment: 0,
    }),
    adjustmentRepo: createEntityRepo(),
    orderMaterialRepo: createEntityRepo(),
    itemRepo: createEntityRepo(),
    materialRepo: createEntityRepo(),
    employeeRepo: createEntityRepo([{ id: 9001, name: '王领队' }]),
  });

  await assert.rejects(
    () => service.addAdjustment(702, 9001, { adjust_type: 1, service_name: '擦玻璃', adjust_amount: 50 }),
    /服务中/,
  );
});

test('addAdjustment 拒绝非本人领队录入', async () => {
  const service = createService({
    orderRepo: createOrderRepo({
      id: 703,
      status: OrderStatus.IN_SERVICE,
      leader_id: 9001,
      total_amount: 300,
      extra_amount: 0,
      final_payment: 0,
    }),
    adjustmentRepo: createEntityRepo(),
    orderMaterialRepo: createEntityRepo(),
    itemRepo: createEntityRepo(),
    materialRepo: createEntityRepo(),
    employeeRepo: createEntityRepo([{ id: 9002, name: '李领队' }]),
  });

  await assert.rejects(
    () => service.addAdjustment(703, 9002, { adjust_type: 1, service_name: '擦玻璃', adjust_amount: 50 }),
    /非本人/,
  );
});

test('addAdjustment 增补物料时同步写入物料记录', async () => {
  const orderRepo = createOrderRepo({
    id: 704,
    status: OrderStatus.IN_SERVICE,
    leader_id: 9001,
    total_amount: 300,
    extra_amount: 0,
    final_payment: 0,
  });
  const adjustmentRepo = createEntityRepo();
  const orderMaterialRepo = createEntityRepo();
  const itemRepo = createEntityRepo();
  const materialRepo = createEntityRepo([{ id: 11, name: '除胶剂', status: 1 }]);
  const employeeRepo = createEntityRepo([{ id: 9001, name: '王领队' }]);
  const service = createService({ orderRepo, adjustmentRepo, orderMaterialRepo, itemRepo, materialRepo, employeeRepo });

  await service.addAdjustment(704, 9001, {
    adjust_type: 3,
    material_id: 11,
    material_quantity: 2,
    adjust_amount: 30,
  });

  assert.deepEqual(orderMaterialRepo.getSaveCalls().map((item) => ({
    material_id: item.material_id,
    material_name: item.material_name,
    quantity: item.quantity,
    is_extra: item.is_extra,
  })), [
    { material_id: 11, material_name: '除胶剂', quantity: 2, is_extra: 1 },
  ]);
});
