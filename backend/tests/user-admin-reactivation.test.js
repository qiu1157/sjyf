const assert = require('assert');
const { BadRequestException } = require('@nestjs/common');

const { UserAdminService } = require('../dist/modules/user-admin/user-admin.service');

function createEmployeeRepo(state) {
  return {
    async findOne(options) {
      const where = options?.where || {};

      if (Object.prototype.hasOwnProperty.call(where, 'phone')) {
        return state.employees.find((item) => item.phone === where.phone) || null;
      }

      return state.employees.find((item) => (
        (where.id === undefined || item.id === where.id) &&
        (where.openid === undefined || item.openid === where.openid) &&
        (where.role === undefined || item.role === where.role) &&
        (where.status === undefined || item.status === where.status) &&
        (where.is_leader_active === undefined || item.is_leader_active === where.is_leader_active)
      )) || null;
    },
    create(payload) {
      return { ...payload };
    },
    async save(entity) {
      if (!entity.id) {
        const duplicateOpenid = state.employees.find((item) => item.openid === entity.openid);
        if (duplicateOpenid) {
          const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: employees.openid');
          error.code = 'SQLITE_CONSTRAINT';
          throw error;
        }
        entity.id = state.nextEmployeeId++;
        state.employees.push({ ...entity });
        return { ...entity };
      }

      const index = state.employees.findIndex((item) => item.id === entity.id);
      if (index >= 0) {
        state.employees[index] = { ...state.employees[index], ...entity };
        return { ...state.employees[index] };
      }

      state.employees.push({ ...entity });
      return { ...entity };
    },
    async update() {
      throw new Error('update should not be called in this test');
    },
  };
}

function createService(state, users) {
  return new UserAdminService(
    {
      async findOne(options) {
        return users.find((item) => item.id === options?.where?.id) || null;
      },
    },
    createEmployeeRepo(state),
    {},
    {},
    { async write() {} },
  );
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

async function testRestoreHistoryLeader() {
  const state = {
    nextEmployeeId: 8,
    employees: [
      {
        id: 7,
        name: '旧领队',
        phone: '13800000001',
        openid: 'mock_openid_reactivate',
        avatar: '',
        role: 4,
        status: 0,
        is_leader_active: 0,
        remark: '旧备注',
      },
    ],
  };
  const service = createService(state, [
    { id: 101, openid: 'mock_openid_reactivate', nickname: '待恢复用户', avatar: 'new-avatar.png' },
  ]);

  const result = await service.setLeader(
    101,
    { name: '新领队名', phone: '13900000009', status: 1, remark: '重新上岗' },
    { id: 1, role: 1, name: '管理员' },
  );

  assert.strictEqual(result.id, 7, '应复用旧领队档案 id');
  assert.strictEqual(state.employees.length, 1, '不应新增第二条领队档案');
  assert.strictEqual(state.employees[0].is_leader_active, 1, '旧档案应恢复为有效领队');
  assert.strictEqual(state.employees[0].name, '新领队名', '姓名应使用本次提交值覆盖');
  assert.strictEqual(state.employees[0].phone, '13900000009', '手机号应使用本次提交值覆盖');
  assert.strictEqual(state.employees[0].remark, '重新上岗', '备注应使用本次提交值覆盖');
}

async function testRepeatSetStillRejected() {
  const state = {
    nextEmployeeId: 12,
    employees: [
      {
        id: 11,
        name: '已在岗领队',
        phone: '13800000011',
        openid: 'mock_openid_active',
        avatar: '',
        role: 4,
        status: 1,
        is_leader_active: 1,
        remark: '在岗',
      },
    ],
  };
  const service = createService(state, [
    { id: 102, openid: 'mock_openid_active', nickname: '有效领队用户', avatar: 'leader.png' },
  ]);

  await expectBadRequest(
    () => service.setLeader(
      102,
      { name: '重复设置', phone: '13800000011', status: 1, remark: '重复' },
      { id: 1, role: 1, name: '管理员' },
    ),
    '该用户已是领队',
  );
}

async function testRestoreConflictPhoneRejected() {
  const state = {
    nextEmployeeId: 22,
    employees: [
      {
        id: 21,
        name: '历史领队',
        phone: '13800000021',
        openid: 'mock_openid_history',
        avatar: '',
        role: 4,
        status: 0,
        is_leader_active: 0,
        remark: '历史',
      },
      {
        id: 30,
        name: '其他员工',
        phone: '13900000030',
        openid: 'mock_openid_other',
        avatar: '',
        role: 5,
        status: 1,
        is_leader_active: 0,
        remark: '占用手机号',
      },
    ],
  };
  const service = createService(state, [
    { id: 103, openid: 'mock_openid_history', nickname: '待恢复用户', avatar: 'history.png' },
  ]);

  await expectBadRequest(
    () => service.setLeader(
      103,
      { name: '恢复失败', phone: '13900000030', status: 1, remark: '手机号冲突' },
      { id: 1, role: 1, name: '管理员' },
    ),
    '手机号已被其他员工使用',
  );
}

async function main() {
  await testRestoreHistoryLeader();
  await testRepeatSetStillRejected();
  await testRestoreConflictPhoneRejected();
  console.log('PASS user-admin-reactivation');
}

main().catch((error) => {
  console.error('FAIL user-admin-reactivation');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
