const assert = require('assert');
const { EmployeeService } = require('../dist/modules/employee/employee.service');

function createEmployeeRepo(items) {
  return {
    createQueryBuilder() {
      return {
        andWhere() { return this; },
        orderBy() { return this; },
        skip() { return this; },
        take() { return this; },
        async getManyAndCount() {
          return [items.map((item) => ({ ...item })), items.length];
        },
      };
    },
  };
}

function createUserRepo(users) {
  return {
    createQueryBuilder() {
      return {
        where() { return this; },
        async getMany() {
          return users.map((item) => ({ ...item }));
        },
      };
    },
  };
}

function createOrderRepo(rawCounts) {
  return {
    createQueryBuilder() {
      return {
        select() { return this; },
        addSelect() { return this; },
        where() { return this; },
        groupBy() { return this; },
        async getRawMany() {
          return rawCounts.map((item) => ({ ...item }));
        },
      };
    },
  };
}

async function main() {
  const service = new EmployeeService(
    createEmployeeRepo([
      {
        id: 101,
        name: '张领队',
        phone: '13800000001',
        role: 4,
        status: 1,
        remark: '擅长深度清洁',
        openid: 'leader-openid-1',
        is_leader_active: 1,
        created_at: '2026-07-26 09:00:00',
      },
    ]),
    createUserRepo([
      { id: 201, openid: 'leader-openid-1', nickname: '张领队微信', avatar: 'avatar.png' },
    ]),
    createOrderRepo([
      { leader_id: 101, count: 3 },
    ]),
  );

  const result = await service.list({ page: 1, pageSize: 20 });

  assert.strictEqual(result.list.length, 1, '应返回 1 条员工记录');
  assert.strictEqual(result.list[0].role, 4, '应返回领队角色');
  assert.strictEqual(result.list[0].is_leader_active, 1, '员工列表应返回 is_leader_active 供前端领队下拉筛选');

  console.log('PASS employee-list-leader-flag');
}

main().catch((error) => {
  console.error('FAIL employee-list-leader-flag');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
