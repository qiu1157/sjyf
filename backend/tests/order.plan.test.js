const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../dist/modules/order/order.service');
const { OrderStatus } = require('../dist/common/constants/order-status.constants');

function createOrderRepo(initialOrder) {
  let currentOrder = { ...initialOrder };

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
    getCurrent: () => ({ ...currentOrder }),
  };
}

function createRelationRepo(initialRows = []) {
  let rows = initialRows.map((item) => ({ ...item }));
  const deleteCalls = [];
  const saveCalls = [];

  return {
    delete: async (criteria) => {
      deleteCalls.push(criteria);
      return { affected: rows.length };
    },
    create: (payload) => ({ ...payload }),
    save: async (payload) => {
      const list = Array.isArray(payload) ? payload.map((item) => ({ ...item })) : [{ ...payload }];
      saveCalls.push(...list);
      rows = list;
      return Array.isArray(payload) ? list : list[0];
    },
    find: async () => rows.map((item) => ({ ...item })),
    getDeleteCalls: () => deleteCalls.map((item) => ({ ...item })),
    getSaveCalls: () => saveCalls.map((item) => ({ ...item })),
  };
}

function createEmployeeRepo(employeeList) {
  const employees = employeeList.map((item) => ({ ...item }));

  return {
    findOne: async ({ where }) => {
      return employees.find((item) => item.id === where.id) || null;
    },
    find: async ({ where }) => {
      const ids = where.id && where.id._value ? where.id._value : where.id;
      if (Array.isArray(ids)) {
        return employees.filter((item) => ids.includes(item.id));
      }
      return employees;
    },
  };
}

function createMaterialRepo(materialList) {
  const materials = materialList.map((item) => ({ ...item }));

  return {
    find: async ({ where }) => {
      const ids = where.id && where.id._value ? where.id._value : where.id;
      if (Array.isArray(ids)) {
        return materials.filter((item) => ids.includes(item.id));
      }
      return materials;
    },
  };
}

function createService({ orderRepo, oeRepo, omRepo, materialRepo, empRepo }) {
  const noopRepo = {
    find: async () => [],
    findOne: async () => null,
    create: (payload) => ({ ...payload }),
    save: async (payload) => payload,
    delete: async () => ({ affected: 0 }),
  };
  const historyCalls = [];
  const orderHistoryService = {
    record: async (...args) => {
      historyCalls.push(args);
      return undefined;
    },
  };

  const service = new OrderService(
    orderRepo,
    oeRepo,
    omRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    materialRepo,
    empRepo,
    noopRepo,
    noopRepo,
    orderHistoryService,
  );

  service.detail = async () => ({
    order: orderRepo.getCurrent(),
    employees: oeRepo.getSaveCalls(),
    materials: omRepo.getSaveCalls(),
    photos: [],
    adjustments: [],
  });
  service.__historyCalls = historyCalls;

  return service;
}

function buildPlanDetail() {
  return {
    areas: [
      { area_key: 'entrance', area_name: '玄关', plan_hours: 0.5, plan_content: '玄关柜表面除尘' },
      { area_key: 'living_room', area_name: '客厅', plan_hours: 1, plan_content: '地面与沙发表面清洁' },
      { area_key: 'kitchen', area_name: '厨房', plan_hours: 1, plan_content: '台面与柜门去污' },
      { area_key: 'master_wardrobe', area_name: '主卧衣柜', plan_hours: 0.5, plan_content: '柜体整理' },
      { area_key: 'second_room', area_name: '次卧/儿童房', plan_hours: 0.5, plan_content: '桌面和地面整理' },
      { area_key: 'bathroom', area_name: '卫生间', plan_hours: 1, plan_content: '五金与台盆清洁' },
      { area_key: 'other', area_name: '其他区域', plan_hours: 0, plan_content: '' },
    ],
  };
}

test('plan 将区域方案聚合保存并自动汇总计划工时', async () => {
  const orderRepo = createOrderRepo({
    id: 301,
    status: OrderStatus.PENDING_ACCEPT,
    leader_id: null,
    plan_hours: 0,
    service_plan: null,
    service_plan_detail: null,
    accept_time: null,
  });
  const oeRepo = createRelationRepo([{ order_id: 301, employee_id: 99, is_leader: 0 }]);
  const omRepo = createRelationRepo([{ order_id: 301, material_id: 88, material_name: '旧物料', quantity: 1, is_extra: 0 }]);
  const empRepo = createEmployeeRepo([
    { id: 11, role: 4, status: 1, is_leader_active: 1, name: '张领队' },
    { id: 12, role: 5, status: 1, is_leader_active: 0, name: '李阿姨' },
  ]);
  const materialRepo = createMaterialRepo([
    { id: 201, name: '除尘布', status: 1 },
  ]);
  const service = createService({ orderRepo, oeRepo, omRepo, materialRepo, empRepo });
  const servicePlanDetail = buildPlanDetail();

  const result = await service.plan(301, {
    leader_id: 11,
    employee_ids: [11, 12],
    material_list: [{ material_id: 201, quantity: 2 }],
    service_plan_detail: servicePlanDetail,
  });

  assert.equal(Number(result.order.plan_hours), 4.5);
  assert.equal(result.order.leader_id, 11);
  assert.equal(result.order.status, OrderStatus.PENDING_DOOR);
  assert.ok(result.order.accept_time instanceof Date);
  assert.deepEqual(JSON.parse(result.order.service_plan_detail), servicePlanDetail);
  assert.deepEqual(oeRepo.getDeleteCalls(), [{ order_id: 301 }]);
  assert.deepEqual(omRepo.getDeleteCalls(), [{ order_id: 301, is_extra: 0 }]);
  assert.deepEqual(result.employees.map((item) => ({
    employee_id: item.employee_id,
    is_leader: item.is_leader,
  })), [
    { employee_id: 11, is_leader: 1 },
    { employee_id: 12, is_leader: 0 },
  ]);
  assert.deepEqual(result.materials.map((item) => ({
    material_id: item.material_id,
    material_name: item.material_name,
    quantity: item.quantity,
  })), [
    { material_id: 201, material_name: '除尘布', quantity: 2 },
  ]);
});

test('plan 拒绝无效领队', async () => {
  const orderRepo = createOrderRepo({
    id: 302,
    status: OrderStatus.PENDING_ACCEPT,
    leader_id: null,
    plan_hours: 0,
    service_plan_detail: null,
    accept_time: null,
  });
  const oeRepo = createRelationRepo();
  const omRepo = createRelationRepo();
  const empRepo = createEmployeeRepo([
    { id: 12, role: 5, status: 1, is_leader_active: 0, name: '李阿姨' },
  ]);
  const materialRepo = createMaterialRepo([]);
  const service = createService({ orderRepo, oeRepo, omRepo, materialRepo, empRepo });

  await assert.rejects(
    () => service.plan(302, {
      leader_id: 12,
      employee_ids: [12],
      material_list: [],
      service_plan_detail: buildPlanDetail(),
    }),
    /领队/,
  );
});

test('plan 拒绝超过500字符的方案内容', async () => {
  const orderRepo = createOrderRepo({
    id: 303,
    status: OrderStatus.PENDING_ACCEPT,
    leader_id: null,
    plan_hours: 0,
    service_plan_detail: null,
    accept_time: null,
  });
  const oeRepo = createRelationRepo();
  const omRepo = createRelationRepo();
  const empRepo = createEmployeeRepo([
    { id: 11, role: 4, status: 1, is_leader_active: 1, name: '张领队' },
  ]);
  const materialRepo = createMaterialRepo([]);
  const service = createService({ orderRepo, oeRepo, omRepo, materialRepo, empRepo });
  const servicePlanDetail = buildPlanDetail();
  servicePlanDetail.areas[0].plan_content = '超'.repeat(501);

  await assert.rejects(
    () => service.plan(303, {
      leader_id: 11,
      employee_ids: [11],
      material_list: [],
      service_plan_detail: servicePlanDetail,
    }),
    /500/,
  );
});

test('plan 在待接单状态下支持接单时改期并写入改期历史', async () => {
  const orderRepo = createOrderRepo({
    id: 304,
    status: OrderStatus.PENDING_ACCEPT,
    leader_id: null,
    plan_hours: 0,
    service_plan_detail: null,
    accept_time: null,
    book_date: '2026-07-27',
    book_time: '09:00-13:00',
  });
  const oeRepo = createRelationRepo();
  const omRepo = createRelationRepo();
  const empRepo = createEmployeeRepo([
    { id: 11, role: 4, status: 1, is_leader_active: 1, name: '张领队' },
  ]);
  const materialRepo = createMaterialRepo([]);
  const service = createService({ orderRepo, oeRepo, omRepo, materialRepo, empRepo });

  const result = await service.plan(304, {
    leader_id: 11,
    employee_ids: [11],
    material_list: [],
    book_date: '2026-07-29',
    book_time: '13:00-17:00',
    service_plan_detail: buildPlanDetail(),
  }, 9001);

  assert.equal(result.order.status, OrderStatus.PENDING_DOOR);
  assert.equal(result.order.book_date, '2026-07-29');
  assert.equal(result.order.book_time, '13:00-17:00');
  assert.equal(service.__historyCalls.length, 2);
  assert.deepEqual(service.__historyCalls[0].slice(0, 5), [
    304,
    2,
    '2026-07-27 09:00-13:00',
    '2026-07-29 13:00-17:00',
    9001,
  ]);
  assert.deepEqual(service.__historyCalls[1].slice(0, 6), [
    304,
    1,
    String(OrderStatus.PENDING_ACCEPT),
    String(OrderStatus.PENDING_DOOR),
    9001,
    1,
  ]);
});

test('plan 在待接单状态下拒绝过去日期的接单改期', async () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const orderRepo = createOrderRepo({
    id: 305,
    status: OrderStatus.PENDING_ACCEPT,
    leader_id: null,
    plan_hours: 0,
    service_plan_detail: null,
    accept_time: null,
    book_date: '2026-07-27',
    book_time: '09:00-13:00',
  });
  const oeRepo = createRelationRepo();
  const omRepo = createRelationRepo();
  const empRepo = createEmployeeRepo([
    { id: 11, role: 4, status: 1, is_leader_active: 1, name: '张领队' },
  ]);
  const materialRepo = createMaterialRepo([]);
  const service = createService({ orderRepo, oeRepo, omRepo, materialRepo, empRepo });

  await assert.rejects(
    () => service.plan(305, {
      leader_id: 11,
      employee_ids: [11],
      material_list: [],
      book_date: yesterday,
      book_time: '13:00-17:00',
      service_plan_detail: buildPlanDetail(),
    }, 9001),
    /不能早于今天/,
  );
});
