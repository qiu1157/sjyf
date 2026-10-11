// app.js
App({
  onLaunch() {
    // 小程序启动时执行
    console.log('小程序启动');
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取系统信息
    this.getSystemInfo();
  },

  onShow() {
    // 小程序显示时触发
  },

  onHide() {
    // 小程序隐藏时触发
  },

  onError(msg) {
    // 小程序发生脚本错误或 API 调用报错时触发
    console.error('小程序错误:', msg);
  },

  // 全局数据
  globalData: {
    userInfo: null,
    token: '',
    systemInfo: null
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      // 验证token有效性
      this.validateToken(token);
    }
  },

  // 验证token
  validateToken(token) {
    // 这里可以添加token验证逻辑
    console.log('验证token:', token);
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      }
    });
  },

  // 用户登录
  login(callback) {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送 res.code 到后台换取 openId, sessionKey, unionId
          console.log('登录code:', res.code);
          // 这里调用后端登录接口
          callback && callback(res);
        } else {
          console.error('登录失败:', res.errMsg);
        }
      }
    });
  }
});
