function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function formatRange(range) {
  if (!Array.isArray(range) || range.length !== 2 || !range[0] || !range[1]) {
    return {};
  }

  return {
    start: range[0].format('YYYY-MM-DD'),
    end: range[1].format('YYYY-MM-DD'),
  };
}

export function buildOrderListParams(filters = {}) {
  const params = {};
  const orderNo = normalizeText(filters.order_no);
  const userKeyword = normalizeText(filters.user_keyword);
  const bookDateRange = formatRange(filters.book_date_range);
  const createdAtRange = formatRange(filters.created_at_range);

  if (filters.status !== undefined && filters.status !== '') {
    params.status = filters.status;
  }
  if (orderNo) {
    params.order_no = orderNo;
  }
  if (userKeyword) {
    params.user_keyword = userKeyword;
  }
  if (filters.service_item_id !== undefined && filters.service_item_id !== null && filters.service_item_id !== '') {
    params.service_item_id = filters.service_item_id;
  }
  if (filters.leader_id !== undefined && filters.leader_id !== null && filters.leader_id !== '') {
    params.leader_id = filters.leader_id;
  }
  if (bookDateRange.start && bookDateRange.end) {
    params.book_date_start = bookDateRange.start;
    params.book_date_end = bookDateRange.end;
  }
  if (createdAtRange.start && createdAtRange.end) {
    params.created_at_start = createdAtRange.start;
    params.created_at_end = createdAtRange.end;
  }
  if (filters.page !== undefined) {
    params.page = filters.page;
  }
  if (filters.pageSize !== undefined) {
    params.pageSize = filters.pageSize;
  }

  return params;
}
