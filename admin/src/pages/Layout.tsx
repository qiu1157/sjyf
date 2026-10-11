import { Layout as AntLayout, Menu, Dropdown, Avatar } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, ShoppingOutlined, AppstoreOutlined, TeamOutlined,
  GiftOutlined, AccountBookOutlined, UserOutlined, LogoutOutlined, ToolOutlined,
  TagsOutlined, FolderOpenOutlined, KeyOutlined, SafetyCertificateOutlined,
  ProfileOutlined, SolutionOutlined,
} from '@ant-design/icons';
import { colors } from '../theme';

const { Header, Sider, Content } = AntLayout;

// 角色常量
const ROLE_ADMIN = 1;

// 可配置菜单项定义：menu_key 对应后端 role_menu_permissions，path 对应前端路由
// 系统管理员默认全部可见；主管按 admin_menus 过滤
const CONFIGURABLE_ITEMS = [
  { menuKey: 'dashboard', path: '/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { menuKey: 'orders', path: '/orders', icon: <ShoppingOutlined />, label: '订单管理' },
  { menuKey: 'services', path: '/categories', icon: <FolderOpenOutlined />, label: '内容管理', subMenu: true },
  { menuKey: 'employees', path: '/employees', icon: <TeamOutlined />, label: '人员管理' },
  { menuKey: 'materials', path: '/materials', icon: <ToolOutlined />, label: '物料管理' },
  { menuKey: 'finance', path: '/finance', icon: <AccountBookOutlined />, label: '账务管理' },
  { menuKey: 'users', path: '/wx-users', icon: <SolutionOutlined />, label: '用户信息' },
  { menuKey: 'coupons', path: '/coupons', icon: <GiftOutlined />, label: '优惠券' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
  const menus: string[] = JSON.parse(localStorage.getItem('admin_menus') || '[]');
  const isAdmin = user.role === ROLE_ADMIN;
  const selectedKey = location.pathname.startsWith('/wx-users/')
    ? '/wx-users'
    : location.pathname;

  // 构建菜单项：系统管理员全部，主管按 menus 过滤
  const items: any[] = CONFIGURABLE_ITEMS.filter((it) => isAdmin || menus.includes(it.menuKey)).map((it) => {
    if (it.subMenu) {
      // 内容管理 SubMenu：服务品类 + 服务管理
      return {
        key: 'content-management',
        icon: it.icon,
        label: it.label,
        children: [
          { key: '/categories', icon: <TagsOutlined />, label: '服务品类' },
          { key: '/services', icon: <AppstoreOutlined />, label: '服务管理' },
        ],
      };
    }
    return { key: it.path, icon: it.icon, label: it.label };
  });

  // 账号管理、菜单权限配置：仅系统管理员可见（不在可配置菜单体系）
  if (isAdmin) {
    items.push({ key: '/accounts', icon: <KeyOutlined />, label: '账号管理' });
    items.push({ key: '/menu-permission', icon: <SafetyCertificateOutlined />, label: '菜单权限配置' });
  }

  // 个人中心：所有角色可见
  items.push({ key: '/profile', icon: <ProfileOutlined />, label: '个人中心' });

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_menus');
    navigate('/login');
  };

  // 默认展开内容管理 SubMenu
  const openKeys = (isAdmin || menus.includes('services')) ? ['content-management'] : [];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={220} style={{ borderRight: `1px solid ${colors.neutral200}` }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.neutral200}` }}>
          <h2 style={{ margin: 0, color: colors.primary }}>拾家有方</h2>
          <div style={{ fontSize: 12, color: colors.neutral400 }}>家政服务管理系统</div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          background: colors.neutral0, padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: `1px solid ${colors.neutral200}`,
        }}>
          <div>
            <span style={{ background: colors.warningBg, color: colors.warning, padding: '4px 12px', borderRadius: 4, fontSize: 12 }}>
              开发环境 · 模拟支付
            </span>
          </div>
          <Dropdown menu={{
            items: [
              { key: 'profile', icon: <ProfileOutlined />, label: '个人中心', onClick: () => navigate('/profile') },
              { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout },
            ],
          }}>
            <span style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              {user.name || '管理员'}
            </span>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: colors.background }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
