import { api } from './request';

/**
 * 登录态管理工具
 * 封装登录/退出/登录判断/用户信息存取，供页面统一调用
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'userInfo';
// 领队标识：wxLogin 返回的 leaderEmployee {id,name} 或 null
const LEADER_KEY = 'leaderEmployee';

/** 是否已登录（本地存在 token） */
export function isLogin(): boolean {
  return !!uni.getStorageSync(TOKEN_KEY);
}

/** 获取本地缓存的用户信息（不触发网络请求） */
export function getUserInfo(): any {
  return uni.getStorageSync(USER_KEY) || null;
}

/**
 * 获取本地缓存的领队标识
 * @returns 领队 {id,name} 或 null（普通用户/未登录）
 */
export function getLeaderEmployee(): { id: number; name: string } | null {
  const v = uni.getStorageSync(LEADER_KEY);
  return v || null;
}

/** 当前登录用户是否为领队（本地缓存判定） */
export function isLeader(): boolean {
  return !!getLeaderEmployee();
}

/**
 * 手机号登录（H5 兜底 / 开发环境）
 * 登录成功后写入 token 与 userInfo，领队标识置空
 */
export async function loginByPhone(phone: string, nickname?: string) {
  const res: any = await api.devLogin(phone, nickname);
  uni.setStorageSync(TOKEN_KEY, res.token);
  uni.setStorageSync(USER_KEY, res.userInfo);
  uni.removeStorageSync(LEADER_KEY);
  return res.userInfo;
}

/**
 * 微信登录（小程序环境）
 * 调 uni.login 拿 code，再调后端 wx-login
 * 登录成功后写入 token、userInfo、leaderEmployee（领队标识，普通用户为 null）
 */
export async function loginByWx() {
  const { code } = await uni.login();
  const res: any = await api.userLogin(code);
  uni.setStorageSync(TOKEN_KEY, res.token);
  uni.setStorageSync(USER_KEY, res.userInfo);
  // 领队标识：后端检测 role=4 status=1 is_leader_active=1 返回 {id,name}，否则 null
  uni.setStorageSync(LEADER_KEY, res.leaderEmployee || null);
  return res.userInfo;
}

/**
 * 开发环境领队 Mock 登录
 * 用固定 mock code 调 wxLogin，命中 seed 领队 openid（mock_openid_leader1）
 * 用于在小程序/H5 开发环境验收领队标识返回与工作台入口
 * 生产环境不应使用
 */
export async function loginAsLeaderMock() {
  const res: any = await api.userLogin('leader1');
  uni.setStorageSync(TOKEN_KEY, res.token);
  uni.setStorageSync(USER_KEY, res.userInfo);
  uni.setStorageSync(LEADER_KEY, res.leaderEmployee || null);
  return res;
}

/**
 * 退出登录
 * 调后端 logout（可选），清除本地存储（含领队标识）
 */
export async function logout() {
  try {
    if (isLogin()) await api.logout();
  } catch (_) {
    // 忽略网络失败，本地仍需清除
  }
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
  uni.removeStorageSync(LEADER_KEY);
}

/**
 * 刷新当前登录用户信息（页面 onShow 恢复登录态用）
 * 无 token 时返回 null，不抛错
 * 注：会同步刷新本地 leaderEmployee 标识，用于感知后台领队身份变化
 */
export async function refreshProfile(): Promise<any | null> {
  if (!isLogin()) return null;
  try {
    const profile: any = await api.getProfile();
    const { leaderEmployee = null, ...user } = profile || {};
    uni.setStorageSync(USER_KEY, user);
    uni.setStorageSync(LEADER_KEY, leaderEmployee || null);
    return user;
  } catch (_) {
    // token 失效时 request 拦截器已清除 storage，此处返回 null
    return null;
  }
}

/**
 * 判断当前是否微信小程序环境
 * uni.canIUse('login') 在 H5 也返回 true，故用平台标识判断
 */
export function isMpWeixin(): boolean {
  try {
    // #ifdef MP-WEIXIN
    return true;
    // #endif
    // #ifndef MP-WEIXIN
    return false;
    // #endif
  } catch (_) {
    return false;
  }
}
