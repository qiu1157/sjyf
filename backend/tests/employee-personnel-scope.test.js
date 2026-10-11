const assert = require('assert');
const { BadRequestException } = require('@nestjs/common');

const { EmployeeService } = require('../dist/modules/employee/employee.service');

function createRepo(state) {
  return {
    async findOne(options) {
      const where = options?.where || {};
      if (where.id !== undefined) {
        return state.items.find((item) => item.id === where.id) || null;
      }
      if (where.phone !== undefined) {
        return state.items.find((item) => item.phone === where.phone) || null;
      }
      return null;
    },
    create(payload) {
      return { ...payload };
    },
    async save(entity) {
      const saved = { id: state.nextId++, status: 1, ...entity };
      state.items.push(saved);
      return { ...saved };
    },
    async update(id, data) {
      const index = state.items.findIndex((item) => item.id === id);
      if (index >= 0) {
        state.items[index] = { ...state.items[index], ...data };
      }
    },
  };
}

async function expectBadRequest(fn, message) {
  try {
    await fn();
    throw new Error(`expected BadRequestException: ${message}`);
  } catch (error) {
    assert.ok(error instanceof BadRequestException, `应抛出 BadRequestException: ${message}`);
    assert.strictEqual(error.message, message);
  }
}

async function main() {
  const state = {
    nextId: 3,
    items: [
      { id: 1, name: '已有领队', phone: '13800000001', role: 4, status: 1, is_leader_active: 1 },
      { id: 2, name: '已有服务人员', phone: '13800000002', role: 5, status: 1, is_leader_active: 0 },
    ],
  };
  const repo = createRepo(state);
  const service = new EmployeeService(repo, {}, {});

  await expectBadRequest(
    () => service.create({ name: '非法领队', phone: '13800000003', role: 4 }),
    '人员管理仅支持新增服务人员',
  );

  const created = await service.create({ name: '新服务人员', phone: '13800000004', role: 5 });
  assert.strictEqual(created.role, 5, '新增员工应固定为服务人员');
  assert.strictEqual(state.items.length, 3, '应新增一条服务人员记录');

  await expectBadRequest(
    () => service.create({ name: '重复手机号', phone: '13800000002', role: 5 }),
    '手机号已被其他员工使用',
  );

  console.log('PASS employee-personnel-scope');
}

main().catch((error) => {
  console.error('FAIL employee-personnel-scope');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
