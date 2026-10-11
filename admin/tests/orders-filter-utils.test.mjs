import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderListParams } from '../src/pages/orders-filter-utils.mjs';

function createFakeDay(value) {
  return {
    format(pattern) {
      assert.equal(pattern, 'YYYY-MM-DD');
      return value;
    },
  };
}

test('buildOrderListParams 清洗多条件筛选参数并展开日期区间', () => {
  const result = buildOrderListParams({
    status: 91,
    order_no: ' SJ20260727001 ',
    user_keyword: ' 13800138000 ',
    service_item_id: 201,
    leader_id: 501,
    book_date_range: [createFakeDay('2026-07-28'), createFakeDay('2026-07-31')],
    created_at_range: [createFakeDay('2026-07-26'), createFakeDay('2026-07-27')],
    page: 3,
    pageSize: 50,
  });

  assert.deepEqual(result, {
    status: 91,
    order_no: 'SJ20260727001',
    user_keyword: '13800138000',
    service_item_id: 201,
    leader_id: 501,
    book_date_start: '2026-07-28',
    book_date_end: '2026-07-31',
    created_at_start: '2026-07-26',
    created_at_end: '2026-07-27',
    page: 3,
    pageSize: 50,
  });
});

test('buildOrderListParams 会忽略空字符串和不完整区间', () => {
  const result = buildOrderListParams({
    status: '',
    order_no: '   ',
    user_keyword: '',
    service_item_id: undefined,
    leader_id: null,
    book_date_range: [createFakeDay('2026-07-28')],
    created_at_range: null,
    page: 1,
    pageSize: 20,
  });

  assert.deepEqual(result, {
    page: 1,
    pageSize: 20,
  });
});
