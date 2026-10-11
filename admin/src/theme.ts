import type { ThemeConfig } from 'antd';

// 色值常量（严格遵循前端设计规范第二章色值令牌）
// 组件中禁止使用硬编码色值，统一引用此处的常量
export const colors = {
  // 主色（暖棕）
  primary: '#B76E45',        // primary-500 主品牌色
  primaryDark: '#9E5B37',    // primary-600 按钮按下态
  primaryLight: '#CB8750',   // primary-400
  primary100: '#F5E4D4',     // primary-100 浅色背景

  // 中性色
  neutral0: '#FFFFFF',       // neutral-0 白色背景
  neutral50: '#FAF7F2',
  neutral100: '#F3EDE3',
  neutral200: '#E7DECF',    // neutral-200 边框/分隔线
  neutral400: '#B8A78C',     // neutral-400 占位文字
  neutral600: '#7A684F',     // neutral-600 正文辅助
  neutral900: '#201A13',     // neutral-900 标题

  // 语义状态色
  success: '#5B8C5A',
  warning: '#D99A3D',
  warningBg: '#FFF2DF',      // warning 浅色背景
  error: '#C25450',
  info: '#5A84A8',

  // 背景
  background: '#F5F2EC',     // PC 后台主背景
};

// AntD ConfigProvider 主题配置（严格遵循设计规范 §9.3）
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: colors.primary,
    borderRadius: 8,
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif',
  },
};
