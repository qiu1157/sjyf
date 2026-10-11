import { API_BASE_URL } from './config';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  noAuth?: boolean;
  silent401?: boolean;
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    uni.request({
      url: API_BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token && !options.noAuth ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res: any) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else if (res.statusCode === 401) {
          uni.removeStorageSync('token');
          uni.removeStorageSync('userInfo');
          uni.removeStorageSync('leaderEmployee');
          if (!options.silent401) {
            uni.showToast({ title: '请重新登录', icon: 'none' });
          }
          reject(res.data);
        } else {
          uni.showToast({ title: res.data.message || '请求失败', icon: 'none' });
          reject(res.data);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
}

export function uploadFile<T = any>(url: string, filePath: string, name = 'file'): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    uni.uploadFile({
      url: API_BASE_URL + url,
      filePath,
      name,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        const data = JSON.parse(res.data || '{}');
        if (data.code === 0) {
          resolve(data.data);
          return;
        }
        uni.showToast({ title: data.message || '上传失败', icon: 'none' });
        reject(data);
      },
      fail: (err) => {
        uni.showToast({ title: '上传失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

export const api = {
  // 登录
  userLogin: (code: string) => request({ url: '/user/wx-login', method: 'POST', data: { code }, noAuth: true }),
  leaderLogin: (code: string) => request({ url: '/leader/wx-login', method: 'POST', data: { code }, noAuth: true }),
  devLogin: (phone: string, nickname?: string) => request({ url: '/auth/dev-login', method: 'POST', data: { phone, nickname }, noAuth: true }),
  logout: () => request({ url: '/auth/logout', method: 'POST' }),
  getProfile: () => request({ url: '/user/profile' }),

  // 服务
  categories: () => request({ url: '/services/categories', noAuth: true }),
  serviceList: (params?: any) => request({ url: '/services/items', data: params, noAuth: true }),
  serviceDetail: (id: number) => request({ url: `/services/items/${id}`, noAuth: true }),
  banner: () => request({ url: '/services/banner', noAuth: true }),
  latest: () => request({ url: '/services/latest', noAuth: true }),
  hot: () => request({ url: '/services/hot', noAuth: true }),

  // 订单
  createOrder: (data: any) => request({ url: '/orders', method: 'POST', data }),
  myOrders: (params?: any) => request({ url: '/orders', data: params }),
  orderDetail: (id: number) => request({ url: `/orders/${id}` }),
  cancelOrder: (id: number, reason: string) => request({ url: `/orders/${id}/cancel`, method: 'POST', data: { reason } }),
  orderTimeline: (id: number) => request({ url: `/orders/${id}/timeline` }),
  orderAdjustments: (id: number) => request({ url: `/orders/${id}/adjustments` }),

  // 支付
  payFirst: (orderId: number) => request({ url: '/payment/first', method: 'POST', data: { orderId } }),
  payFinal: (orderId: number) => request({ url: '/payment/final', method: 'POST', data: { orderId } }),

  // 地址
  addresses: () => request({ url: '/addresses' }),
  createAddress: (data: any) => request({ url: '/addresses', method: 'POST', data }),
  updateAddress: (id: number, data: any) => request({ url: `/addresses/${id}`, method: 'PUT', data }),
  deleteAddress: (id: number) => request({ url: `/addresses/${id}`, method: 'DELETE' }),
  setDefaultAddress: (id: number) => request({ url: `/addresses/${id}/default`, method: 'POST' }),
  bindPhone: (code: string) => request({ url: '/user/phone', method: 'POST', data: { code } }),

  // 优惠券
  myCoupons: (status?: number) => request({ url: '/coupons/my', data: status !== undefined ? { status } : {} }),
  availableCoupons: (amount: number) => request({ url: '/coupons/available', data: { amount } }),

  // 评价
  submitReview: (data: any) => request({ url: '/reviews', method: 'POST', data }),

  // 领队端
  leaderProfile: () => request({ url: '/leader/profile' }),
  leaderOrders: (params?: any) => request({ url: '/leader/orders', data: params }),
  leaderOrderDetail: (id: number) => request({ url: `/leader/orders/${id}` }),
  signIn: (id: number) => request({ url: `/leader/orders/${id}/sign-in`, method: 'POST' }),
  confirmLeaderStaff: (id: number, data: any) => request({ url: `/leader/orders/${id}/confirm-staff`, method: 'POST', data }),
  confirmLeaderMaterials: (id: number, data: any) => request({ url: `/leader/orders/${id}/confirm-materials`, method: 'POST', data }),
  leaderPhotos: (id: number) => request({ url: `/leader/orders/${id}/photos` }),
  uploadPhotos: (id: number, photos: any[]) => request({ url: `/leader/orders/${id}/photos`, method: 'POST', data: { photos } }),
  deletePhoto: (id: number, photoId: number) => request({ url: `/leader/orders/${id}/photos/${photoId}`, method: 'DELETE' }),
  uploadLeaderPhoto: (filePath: string) => uploadFile('/leader/upload/photo', filePath),
  leaderServices: () => request({ url: '/leader/services' }),
  leaderMaterials: () => request({ url: '/leader/materials' }),
  addAdjustment: (id: number, data: any) => request({ url: `/leader/orders/${id}/adjustments`, method: 'POST', data }),
  updateAdjustment: (id: number, adjId: number, data: any) => request({ url: `/leader/orders/${id}/adjustments/${adjId}`, method: 'PUT', data }),
  deleteAdjustment: (id: number, adjId: number) => request({ url: `/leader/orders/${id}/adjustments/${adjId}`, method: 'DELETE' }),
  acceptance: (id: number, data: any) => request({ url: `/leader/orders/${id}/acceptance`, method: 'POST', data }),
};

export default request;
