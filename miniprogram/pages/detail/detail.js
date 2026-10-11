// 详情页逻辑
Page({
  data: {
    serviceId: '',
    isCollected: false,
    
    // 服务基本信息
    serviceInfo: {
      title: '【好评爆款】全屋深度保洁4小时',
      tags: ['擦玻璃', '厨房清洁', '卫生间消毒', '高温杀菌'],
      price: '199',
      unit: '/次',
      sales: '5682',
      image: 'https://picsum.photos/600/450?random=11'
    },

    // 服务内容
    serviceContent: [
      { id: 1, text: '全屋卧室、客厅、餐厅、书房表面清洁' },
      { id: 2, text: '厨房灶台、油烟机表面、橱柜外部清洁' },
      { id: 3, text: '卫生间马桶、洗手台、镜面、地面深度清洁' },
      { id: 4, text: '门窗玻璃、窗框、窗台清洁（限内窗）' },
      { id: 5, text: '家具表面除尘、物品整理归位' }
    ],

    // 服务保障
    guarantees: [
      { id: 1, icon: '/images/icons/guarantee-1.png', text: '专业培训' },
      { id: 2, icon: '/images/icons/guarantee-2.png', text: '品质保障' },
      { id: 3, icon: '/images/icons/guarantee-3.png', text: '随时退款' },
      { id: 4, icon: '/images/icons/guarantee-4.png', text: '售后无忧' }
    ],

    // 服务流程
    processList: [
      { id: 1, step: '1', title: '在线预约', desc: '选择服务时间，填写服务地址，完成支付' },
      { id: 2, step: '2', title: '派单成功', desc: '系统自动匹配最近的专业服务人员' },
      { id: 3, step: '3', title: '上门服务', desc: '服务人员准时上门，提供标准化服务' },
      { id: 4, step: '4', title: '服务验收', desc: '服务完成后，对服务质量进行评价' }
    ],

    // 用户评价
    reviewList: [
      {
        id: 1,
        avatar: 'https://picsum.photos/100/100?random=12',
        name: '李女士',
        rating: 5,
        content: '阿姨很专业，打扫得非常干净，玻璃擦得特别亮，厨房的油污也都清理干净了，下次还会继续预约！',
        date: '2024-01-15'
      },
      {
        id: 2,
        avatar: 'https://picsum.photos/100/100?random=13',
        name: '王先生',
        rating: 5,
        content: '服务很准时，阿姨人很好，干活也麻利，家里焕然一新的感觉，强烈推荐！',
        date: '2024-01-12'
      },
      {
        id: 3,
        avatar: 'https://picsum.photos/100/100?random=14',
        name: '张女士',
        rating: 4,
        content: '整体服务不错，卫生间清洁很到位，就是时间稍微长了一点，不过效果很好。',
        date: '2024-01-10'
      }
    ]
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        serviceId: options.id
      });
      this.loadServiceDetail(options.id);
    }
    
    // 检查收藏状态
    this.checkCollectStatus();
  },

  // 加载服务详情
  loadServiceDetail(id) {
    wx.showLoading({
      title: '加载中...',
    });
    
    // 这里可以添加API请求逻辑
    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  },

  // 检查收藏状态
  checkCollectStatus() {
    const collectedList = wx.getStorageSync('collectedList') || [];
    const isCollected = collectedList.includes(this.data.serviceId);
    this.setData({
      isCollected
    });
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567',
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 收藏服务
  collectService() {
    let collectedList = wx.getStorageSync('collectedList') || [];
    const serviceId = this.data.serviceId;
    
    if (this.data.isCollected) {
      // 取消收藏
      collectedList = collectedList.filter(id => id !== serviceId);
      wx.showToast({
        title: '已取消收藏',
        icon: 'none'
      });
    } else {
      // 添加收藏
      collectedList.push(serviceId);
      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      });
    }
    
    wx.setStorageSync('collectedList', collectedList);
    this.setData({
      isCollected: !this.data.isCollected
    });
  },

  // 预约服务
  bookService() {
    wx.showLoading({
      title: '正在跳转...',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '跳转预约页面',
        icon: 'none'
      });
      // 这里可以跳转到预约页面
      // wx.navigateTo({
      //   url: `/pages/book/book?id=${this.data.serviceId}`
      // });
    }, 500);
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: this.data.serviceInfo.title,
      path: `/pages/detail/detail?id=${this.data.serviceId}`,
      imageUrl: this.data.serviceInfo.image
    };
  }
});
