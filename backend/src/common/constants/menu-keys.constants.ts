// 后台菜单标识（与前端路由 key 对应）
export const MenuKeys = {
  DASHBOARD: 'dashboard',
  ORDERS: 'orders',
  SERVICES: 'services',
  USERS: 'users',
  EMPLOYEES: 'employees',
  MATERIALS: 'materials',
  FINANCE: 'finance',
  COUPONS: 'coupons',
} as const;

// 可配置菜单项（主管可配置）
export const CONFIGURABLE_MENUS = [
  { key: 'dashboard', label: '数据看板' },
  { key: 'orders', label: '订单管理' },
  { key: 'services', label: '服务内容管理' },
  { key: 'users', label: '用户信息' },
  { key: 'employees', label: '人员管理' },
  { key: 'materials', label: '物料管理' },
  { key: 'finance', label: '账务管理' },
  { key: 'coupons', label: '优惠券管理' },
];

// 系统管理员默认全部可见（不存表，代码硬编码）
export const ADMIN_DEFAULT_MENUS = CONFIGURABLE_MENUS.map(m => m.key);

// 主管默认可见菜单（seed 初始化）
export const SUPERVISOR_DEFAULT_MENUS = ['dashboard', 'orders', 'users', 'employees'];
