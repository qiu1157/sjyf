export const ORDER_TABS = [
  { key: 'in_service', label: '待服务' },
  { key: 'pending_final', label: '待付款' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
  { key: 'all', label: '全部' },
];

const ORDER_STATUS_TEXT_MAP = {
  10: '待支付',
  20: '待接单',
  30: '待上门',
  40: '服务中',
  60: '待付尾款',
  80: '已完成',
  90: '已取消',
  91: '待取消审核中',
};

export function buildOrderQuery(tabKey = 'in_service') {
  const normalizedTabKey = String(tabKey || 'in_service');
  if (normalizedTabKey === 'all') {
    return {};
  }

  return { tab: normalizedTabKey };
}

export function getOrderStatusText(status) {
  return ORDER_STATUS_TEXT_MAP[Number(status)] || '处理中';
}

export function getOrderStatusTagType(status) {
  const normalizedStatus = Number(status);
  if (normalizedStatus === 10 || normalizedStatus === 60) return 'warning';
  if ([20, 30, 40, 91].includes(normalizedStatus)) return 'primary';
  if (normalizedStatus === 80) return 'success';
  return 'default';
}
