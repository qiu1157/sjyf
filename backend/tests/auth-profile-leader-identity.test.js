const assert = require('assert');

const { AuthService } = require('../dist/modules/auth/auth.service');

function createEmployeeRepo() {
  return {
    async findOne(options) {
      const where = options?.where || {};
      if (
        where.openid === 'mock_openid_profile' &&
        where.role === 4 &&
        where.status === 1 &&
        where.is_leader_active === 1
      ) {
        return {
          id: 9,
          name: '新领队',
          openid: 'mock_openid_profile',
          role: 4,
          status: 1,
          is_leader_active: 1,
        };
      }
      return null;
    },
  };
}

async function main() {
  const service = new AuthService(
    {
      async findOne(options) {
        if (options?.where?.id === 201) {
          return {
            id: 201,
            openid: 'mock_openid_profile',
            nickname: '普通用户',
            avatar: 'avatar.png',
            phone: '13900000001',
          };
        }
        return null;
      },
    },
    createEmployeeRepo(),
    { signAsync: async () => 'token' },
    { get: () => 'development' },
    { getMenusByRole: async () => [] },
  );

  const profile = await service.getProfile(201);

  assert.strictEqual(profile.id, 201, '应返回当前用户信息');
  assert.deepStrictEqual(
    profile.leaderEmployee,
    { id: 9, name: '新领队' },
    '已被后台设置为领队的用户刷新资料时应带回 leaderEmployee 标识',
  );

  console.log('PASS auth-profile-leader-identity');
}

main().catch((error) => {
  console.error('FAIL auth-profile-leader-identity');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
