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
      if (where.leader_id !== undefined && currentOrder.leader_id !== where.leader_id) {
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

function createOrderEmployeeRepo(initialRows = []) {
  let rows = initialRows.map((item) => ({ ...item }));

  return {
    find: async ({ where }) => rows.filter((item) => item.order_id === where.order_id).map((item) => ({ ...item })),
    save: async (payload) => {
      const list = Array.isArray(payload) ? payload : [payload];
      list.forEach((item) => {
        const index = rows.findIndex((row) => row.id === item.id);
        if (index >= 0) {
          rows[index] = { ...item };
        } else {
          rows.push({ ...item });
        }
      });
      return Array.isArray(payload) ? list.map((item) => ({ ...item })) : { ...list[0] };
    },
    getRows: () => rows.map((item) => ({ ...item })),
  };
}

function createOrderMaterialRepo(initialRows = []) {
  let rows = initialRows.map((item) => ({ ...item }));

  return {
    find: async ({ where }) => rows.filter((item) => item.order_id === where.order_id).map((item) => ({ ...item })),
    save: async (payload) => {
      const list = Array.isArray(payload) ? payload : [payload];
      list.forEach((item) => {
        const index = rows.findIndex((row) => row.id === item.id);
        if (index >= 0) {
          rows[index] = { ...item };
        } else {
          rows.push({ ...item });
        }
      });
      return Array.isArray(payload) ? list.map((item) => ({ ...item })) : { ...list[0] };
    },
    getRows: () => rows.map((item) => ({ ...item })),
  };
}

function createService({ order, employeeRows = [], materialRows = [] }) {
  const orderRepo = createOrderRepo(order);
  const oeRepo = createOrderEmployeeRepo(employeeRows);
  const omRepo = createOrderMaterialRepo(materialRows);
  const noopRepo = {
    find: async () => [],
    findOne: async () => null,
    create: (payload) => ({ ...payload }),
    save: async (payload) => payload,
    delete: async () => ({ affected: 0 }),
  };
  const orderHistoryService = { record: async () => undefined };

  return {
    service: new OrderService(
      orderRepo,
      oeRepo,
      omRepo,
      noopRepo,
      noopRepo,
      noopRepo,
      noopRepo,
      noopRepo,
      noopRepo,
      noopRepo,
      noopRepo,
      orderHistoryService,
      undefined,
    ),
    orderRepo,
    oeRepo,
    omRepo,
  };
}

test('confirmStaff 仅允许服务中订单批量确认人员到岗并保存统一备注', async () => {
  const { service, orderRepo, oeRepo } = createService({
    order: {
      id: 701,
      status: OrderStatus.IN_SERVICE,
      leader_id: 9001,
      staff_check_remark: '',
    },
    employeeRows: [
      { id: 1, order_id: 701, employee_id: 101, is_leader: 1, arrived_at: null, arrived_by: null },
      { id: 2, order_id: 701, employee_id: 102, is_leader: 0, arrived_at: null, arrived_by: null },
    ],
  });

  const result = await service.confirmStaff(701, 9001, {
    employees: [
      { employee_id: 101, arrived: true },
      { employee_id: 102, arrived: false },
    ],
    remark: '1 人迟到未到场',
  });

  assert.equal(result.order.staff_check_remark, '1 人迟到未到场');
  assert.equal(orderRepo.getCurrent().staff_check_remark, '1 人迟到未到场');
  assert.equal(result.employees.length, 2);

  const savedRows = oeRepo.getRows();
  assert.ok(savedRows[0].arrived_at instanceof Date);
  assert.equal(savedRows[0].arrived_by, 9001);
  assert.equal(savedRows[1].arrived_at, null);
  assert.equal(savedRows[1].arrived_by, null);
});

test('confirmStaff 拒绝非本人领队或非服务中订单操作', async () => {
  const { service } = createService({
    order: {
      id: 702,
      status: OrderStatus.PENDING_DOOR,
      leader_id: 9001,
      staff_check_remark: '',
    },
    employeeRows: [
      { id: 3, order_id: 702, employee_id: 201, is_leader: 1, arrived_at: null, arrived_by: null },
    ],
  });

  await assert.rejects(
    () => service.confirmStaff(702, 9002, {
      employees: [{ employee_id: 201, arrived: true }],
      remark: '',
    }),
    /非本人/,
  );
});

test('confirmMaterials 仅允许服务中订单批量确认物料清点并保存统一备注', async () => {
  const { service, orderRepo, omRepo } = createService({
    order: {
      id: 703,
      status: OrderStatus.IN_SERVICE,
      leader_id: 9001,
      material_check_remark: '',
    },
    materialRows: [
      { id: 11, order_id: 703, material_id: 501, material_name: '除螨仪', checked: 0, checked_at: null, checked_by: null, is_extra: 0 },
      { id: 12, order_id: 703, material_id: 502, material_name: '清洁剂', checked: 0, checked_at: null, checked_by: null, is_extra: 0 },
    ],
  });

  const result = await service.confirmMaterials(703, 9001, {
    materials: [
      { order_material_id: 11, checked: true },
      { order_material_id: 12, checked: false },
    ],
    remark: '清洁剂缺 1 瓶',
  });

  assert.equal(result.order.material_check_remark, '清洁剂缺 1 瓶');
  assert.equal(orderRepo.getCurrent().material_check_remark, '清洁剂缺 1 瓶');
  assert.equal(result.materials.length, 2);

  const savedRows = omRepo.getRows();
  assert.equal(savedRows[0].checked, 1);
  assert.ok(savedRows[0].checked_at instanceof Date);
  assert.equal(savedRows[0].checked_by, 9001);
  assert.equal(savedRows[1].checked, 0);
  assert.equal(savedRows[1].checked_at, null);
  assert.equal(savedRows[1].checked_by, null);
});

test('confirmMaterials 拒绝非服务中订单操作', async () => {
  const { service } = createService({
    order: {
      id: 704,
      status: OrderStatus.PENDING_FINAL,
      leader_id: 9001,
      material_check_remark: '',
    },
    materialRows: [
      { id: 21, order_id: 704, material_id: 601, material_name: '拖把', checked: 0, checked_at: null, checked_by: null, is_extra: 0 },
    ],
  });

  await assert.rejects(
    () => service.confirmMaterials(704, 9001, {
      materials: [{ order_material_id: 21, checked: true }],
      remark: '',
    }),
    /服务中/,
  );
});
