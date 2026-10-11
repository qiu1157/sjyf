const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../dist/modules/order/order.service');

function createQueryBuilder(records) {
  const filters = [];
  let offset = 0;
  let limit = records.length;

  return {
    where() {
      return this;
    },
    andWhere(sql, params) {
      if (sql.includes('o.status = :s')) {
        filters.push((item) => Number(item.status) === Number(params.s));
      }
      if (sql.includes('o.order_no = :orderNo')) {
        filters.push((item) => String(item.order_no) === String(params.orderNo));
      }
      if (sql.includes('(o.order_no LIKE :kw OR o.service_name LIKE :kw)')) {
        const keyword = String(params.kw || '').replace(/%/g, '');
        filters.push((item) => (
          String(item.order_no || '').includes(keyword)
          || String(item.service_name || '').includes(keyword)
        ));
      }
      if (sql.includes('o.address_snapshot LIKE :userKw')) {
        const keyword = String(params.userKw || '').replace(/%/g, '');
        filters.push((item) => String(item.address_snapshot || '').includes(keyword));
      }
      if (sql.includes('o.service_item_id = :serviceItemId')) {
        filters.push((item) => Number(item.service_item_id) === Number(params.serviceItemId));
      }
      if (sql.includes('o.leader_id = :lid')) {
        filters.push((item) => Number(item.leader_id) === Number(params.lid));
      }
      if (sql.includes('o.supervisor_id = :sid')) {
        filters.push((item) => Number(item.supervisor_id) === Number(params.sid));
      }
      if (sql.includes('o.book_date >= :bookDateStart')) {
        filters.push((item) => String(item.book_date || '') >= String(params.bookDateStart));
      }
      if (sql.includes('o.book_date <= :bookDateEnd')) {
        filters.push((item) => String(item.book_date || '') <= String(params.bookDateEnd));
      }
      if (sql.includes('o.created_at >= :createdAtStart')) {
        filters.push((item) => String(item.created_at || '') >= String(params.createdAtStart));
      }
      if (sql.includes('o.created_at <= :createdAtEnd')) {
        filters.push((item) => String(item.created_at || '') <= String(params.createdAtEnd));
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
  const historyService = { record: async () => undefined, listByOrder: async () => [] };

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
    undefined,
  );
}

test('adminList 支持订单号精确匹配与待取消状态筛选', async () => {
  const service = createService([
    { id: 1, order_no: 'SJ20260727001', status: 91, service_name: '深度保洁' },
    { id: 2, order_no: 'SJ20260727001-A', status: 91, service_name: '深度保洁' },
    { id: 3, order_no: 'SJ20260727001', status: 90, service_name: '深度保洁' },
  ]);

  const result = await service.adminList({
    status: 91,
    order_no: 'SJ20260727001',
  });

  assert.equal(result.total, 1);
  assert.deepEqual(result.list.map((item) => item.id), [1]);
});

test('adminList 支持服务项目、用户关键词、预约时间、下单时间和领队组合筛选', async () => {
  const service = createService([
    {
      id: 11,
      status: 30,
      order_no: 'SJ20260727011',
      service_name: '深度保洁',
      service_item_id: 201,
      leader_id: 501,
      book_date: '2026-07-29',
      created_at: '2026-07-27 09:30:00',
      address_snapshot: '{"contact_name":"张三","contact_phone":"13800138000"}',
    },
    {
      id: 12,
      status: 30,
      order_no: 'SJ20260727012',
      service_name: '深度保洁',
      service_item_id: 201,
      leader_id: 501,
      book_date: '2026-07-29',
      created_at: '2026-07-27 09:30:00',
      address_snapshot: '{"contact_name":"张三","contact_phone":"13800138000"}',
    },
    {
      id: 13,
      status: 30,
      order_no: 'SJ20260727013',
      service_name: '深度保洁',
      service_item_id: 202,
      leader_id: 501,
      book_date: '2026-07-29',
      created_at: '2026-07-27 09:30:00',
      address_snapshot: '{"contact_name":"李四","contact_phone":"13900139000"}',
    },
    {
      id: 14,
      status: 30,
      order_no: 'SJ20260727014',
      service_name: '深度保洁',
      service_item_id: 201,
      leader_id: 501,
      book_date: '2026-08-02',
      created_at: '2026-07-27 09:30:00',
      address_snapshot: '{"contact_name":"张三","contact_phone":"13800138000"}',
    },
  ]);

  const result = await service.adminList({
    user_keyword: '13800138000',
    service_item_id: 201,
    leader_id: 501,
    book_date_start: '2026-07-28',
    book_date_end: '2026-07-31',
    created_at_start: '2026-07-27 00:00:00',
    created_at_end: '2026-07-27 23:59:59',
  });

  assert.equal(result.total, 2);
  assert.deepEqual(result.list.map((item) => item.id), [12, 11]);
});
