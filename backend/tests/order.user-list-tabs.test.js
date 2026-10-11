const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../dist/modules/order/order.service');

function createQueryBuilder(records) {
  const filters = [];
  let offset = 0;
  let limit = records.length;

  return {
    where(_sql, params) {
      if (params?.uid !== undefined) {
        filters.push((item) => item.user_id === params.uid);
      }
      return this;
    },
    andWhere(sql, params) {
      if (sql.includes('o.status = :s')) {
        filters.push((item) => item.status === Number(params.s));
      }
      if (sql.includes('o.status IN (:...statuses)')) {
        const statuses = (params.statuses || []).map(Number);
        filters.push((item) => statuses.includes(Number(item.status)));
      }
      return this;
    },
    orderBy() {
      return this;
    },
    skip(value) {
      offset = value;
      return this;
    },
    take(value) {
      limit = value;
      return this;
    },
    async getManyAndCount() {
      const filtered = records.filter((item) => filters.every((matcher) => matcher(item)));
      const sorted = filtered.slice().sort((a, b) => b.id - a.id);
      return [sorted.slice(offset, offset + limit), filtered.length];
    },
  };
}

function createService(records) {
  const orderRepo = {
    createQueryBuilder: () => createQueryBuilder(records),
  };
  const noopRepo = {};
  const historyService = { record: async () => {} };

  return new OrderService(
    orderRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    historyService,
  );
}

test('userList 支持 in_service tab 聚合查询 20/30/40', async () => {
  const service = createService([
    { id: 1, user_id: 9, status: 20 },
    { id: 2, user_id: 9, status: 30 },
    { id: 3, user_id: 9, status: 40 },
    { id: 4, user_id: 9, status: 60 },
    { id: 5, user_id: 8, status: 20 },
  ]);

  const result = await service.userList(9, { tab: 'in_service' });

  assert.deepEqual(
    result.list.map((item) => item.status),
    [40, 30, 20],
  );
  assert.equal(result.total, 3);
});

test('userList 支持 cancelled tab 聚合查询 91/90', async () => {
  const service = createService([
    { id: 11, user_id: 5, status: 90 },
    { id: 12, user_id: 5, status: 91 },
    { id: 13, user_id: 5, status: 80 },
  ]);

  const result = await service.userList(5, { tab: 'cancelled' });

  assert.deepEqual(
    result.list.map((item) => item.status),
    [91, 90],
  );
  assert.equal(result.total, 2);
});

test('userList 在传入 status 时保持原有精确筛选兼容', async () => {
  const service = createService([
    { id: 21, user_id: 7, status: 10 },
    { id: 22, user_id: 7, status: 20 },
    { id: 23, user_id: 7, status: 10 },
  ]);

  const result = await service.userList(7, { status: 10 });

  assert.deepEqual(
    result.list.map((item) => item.id),
    [23, 21],
  );
  assert.equal(result.total, 2);
});
