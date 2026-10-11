const test = require('node:test');
const assert = require('node:assert/strict');

const { SeedService } = require('../dist/modules/seed/seed.module');

function createRepo(countValue = 0) {
  return {
    count: async () => countValue,
    find: async () => [],
    save: async (payload) => payload,
    create: (payload) => payload,
  };
}

function createService({ employeeCount = 0, orderCount = 0 } = {}) {
  return new SeedService(
    createRepo(),
    createRepo(),
    createRepo(),
    createRepo(),
    createRepo(employeeCount),
    createRepo(),
    createRepo(),
    createRepo(),
    createRepo(orderCount),
    createRepo(),
  );
}

test('ENABLE_SEED=false 时 onModuleInit 不执行任何 seed 行为', async () => {
  const service = createService({ employeeCount: 0, orderCount: 0 });
  let seedAllCalled = 0;
  let seedMockOrdersCalled = 0;
  const originalValue = process.env.ENABLE_SEED;

  service.seedAll = async () => {
    seedAllCalled += 1;
  };
  service.seedMockOrders = async () => {
    seedMockOrdersCalled += 1;
  };

  process.env.ENABLE_SEED = 'false';

  try {
    await service.onModuleInit();
  } finally {
    process.env.ENABLE_SEED = originalValue;
  }

  assert.equal(seedAllCalled, 0);
  assert.equal(seedMockOrdersCalled, 0);
});

test('ENABLE_SEED=true 时空员工表仍执行初始化和模拟订单生成', async () => {
  const service = createService({ employeeCount: 0, orderCount: 0 });
  let seedAllCalled = 0;
  let seedMockOrdersCalled = 0;
  const originalValue = process.env.ENABLE_SEED;

  service.seedAll = async () => {
    seedAllCalled += 1;
  };
  service.seedMockOrders = async () => {
    seedMockOrdersCalled += 1;
  };

  process.env.ENABLE_SEED = 'true';

  try {
    await service.onModuleInit();
  } finally {
    process.env.ENABLE_SEED = originalValue;
  }

  assert.equal(seedAllCalled, 1);
  assert.equal(seedMockOrdersCalled, 1);
});
