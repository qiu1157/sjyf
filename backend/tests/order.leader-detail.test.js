const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../dist/modules/order/order.service');

function createRepo({ findOneResult = null, findResult = [] } = {}) {
  return {
    findOne: async () => (findOneResult ? { ...findOneResult } : null),
    find: async () => findResult.map((item) => ({ ...item })),
    create: (payload) => ({ ...payload }),
    save: async (payload) => payload,
    delete: async () => ({ affected: 0 }),
  };
}

function createService({ order, employees = [], employeeProfiles = [], materials = [] }) {
  const orderRepo = createRepo({ findOneResult: order });
  const oeRepo = createRepo({ findResult: employees });
  const omRepo = createRepo({ findResult: materials });
  const empRepo = createRepo({ findResult: employeeProfiles });
  const emptyRepo = createRepo();
  const orderHistoryService = { record: async () => undefined };

  return new OrderService(
    orderRepo,
    oeRepo,
    omRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    emptyRepo,
    empRepo,
    emptyRepo,
    emptyRepo,
    orderHistoryService,
  );
}

test('detail 在传入 leaderId 时拒绝查看非本人订单', async () => {
  const service = createService({
    order: { id: 401, leader_id: 9001 },
  });

  await assert.rejects(
    () => service.detail(401, 9002),
    /非本人/,
  );
});

test('detail 返回领队订单的人员富化与物料列表', async () => {
  const service = createService({
    order: { id: 402, leader_id: 9001 },
    employees: [
      { id: 1, order_id: 402, employee_id: 9001, is_leader: 1 },
      { id: 2, order_id: 402, employee_id: 9002, is_leader: 0 },
    ],
    employeeProfiles: [
      { id: 9001, name: '张领队', password: 'secret' },
      { id: 9002, name: '李阿姨', password: 'secret2' },
    ],
    materials: [
      { id: 1, order_id: 402, material_name: '除尘布', quantity: 2 },
    ],
  });

  const result = await service.detail(402, 9001);

  assert.equal(result.order.id, 402);
  assert.equal(result.employees.length, 2);
  assert.equal(result.employees[0].employee.name, '张领队');
  assert.equal(result.employees[0].employee.password, undefined);
  assert.deepEqual(result.materials.map((item) => item.material_name), ['除尘布']);
});
