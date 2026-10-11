const test = require('node:test');
const assert = require('node:assert/strict');
const { LeaderController } = require('../dist/modules/leader/leader.module');
const { OrderStatus } = require('../dist/common/constants/order-status.constants');

function createEmployeeRepo(employee) {
  return {
    findOne: async ({ where }) => {
      if (!employee || where.id !== employee.id) {
        return null;
      }
      return { ...employee };
    },
  };
}

function createOrderRepo(orders) {
  return {
    find: async ({ where }) => orders.filter((item) => item.leader_id === where.leader_id).map((item) => ({ ...item })),
  };
}

test('profile 使用 leaderEmployeeId 返回领队信息和状态统计', async () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const controller = new LeaderController(
    createEmployeeRepo({
      id: 9001,
      name: '测试领队',
      password: 'secret',
    }),
    createOrderRepo([
      { leader_id: 9001, status: OrderStatus.PENDING_DOOR, book_date: today },
      { leader_id: 9001, status: OrderStatus.IN_SERVICE, book_date: today },
      { leader_id: 9001, status: OrderStatus.PENDING_FINAL, book_date: today },
      { leader_id: 9001, status: OrderStatus.COMPLETED, book_date: today },
      { leader_id: 1234, status: OrderStatus.PENDING_DOOR, book_date: today },
    ]),
  );

  const result = await controller.profile(9001);

  assert.equal(result.employee.id, 9001);
  assert.equal(result.employee.password, undefined);
  assert.equal(result.todayCount, 4);
  assert.equal(result.pendingArrive, 1);
  assert.equal(result.inService, 1);
  assert.equal(result.pendingFinal, 1);
});
