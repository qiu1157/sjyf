/**
 * 订单状态枚举常量
 * 10 待支付 / 20 待接单 / 30 待上门 / 40 服务中
 * 60 待付尾款 / 80 已完成 / 91 待取消 / 90 已取消
 */
export const OrderStatus = {
  PENDING_PAY: 10,
  PENDING_ACCEPT: 20,
  PENDING_DOOR: 30,
  IN_SERVICE: 40,
  PENDING_FINAL: 60,
  COMPLETED: 80,
  PENDING_CANCEL: 91,
  CANCELLED: 90,
} as const;

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];

/** 订单状态中文标签映射 */
export const ORDER_STATUS_LABELS: Record<number, string> = {
  10: '待支付',
  20: '待接单',
  30: '待上门',
  40: '服务中',
  60: '待付尾款',
  80: '已完成',
  91: '待取消',
  90: '已取消',
};

/** 后台状态标签颜色映射（对应 Ant Design Tag color） */
export const ORDER_STATUS_COLORS: Record<number, string> = {
  10: 'default',
  20: 'orange',
  30: 'blue',
  40: 'processing',
  60: 'gold',
  80: 'success',
  91: 'warning',
  90: 'error',
};

/** 用户端订单列表 tab 分组（状态码数组） */
export const ORDER_TAB_USER = {
  PENDING_PAY: [10],
  IN_SERVICE: [20, 30, 40],
  PENDING_FINAL: [60],
  COMPLETED: [80],
  CANCELLED: [91, 90],
};

/** 领队端订单列表 tab 分组（状态码数组） */
export const ORDER_TAB_LEADER = {
  PENDING_DOOR: [30],
  IN_SERVICE: [40],
  PENDING_FINAL: [60],
  COMPLETED: [80],
  CANCELLED: [90],
};
