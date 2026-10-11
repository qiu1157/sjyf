// 首页逻辑
Page({
  data: {
    // 走马灯海报数据
    bannerList: [
      {
        id: 1,
        title: '新人专享福利',
        desc: '首单立减50元，专业家政服务上门',
        image: 'https://picsum.photos/800/400?random=1'
      },
      {
        id: 2,
        title: '深度保洁特惠',
        desc: '全屋大扫除，焕新生活体验',
        image: 'https://picsum.photos/800/400?random=2'
      },
      {
        id: 3,
        title: '家电清洗套餐',
        desc: '空调/油烟机清洗，限时优惠',
        image: 'https://picsum.photos/800/400?random=3'
      }
    ],

    // 服务分类数据
    categoryList: [
      { id: 1, name: '日常保洁', icon: '/images/icons/cleaning.png', bgColor: '#FFF5E6' },
      { id: 2, name: '深度保洁', icon: '/images/icons/deep-clean.png', bgColor: '#E6F7FF' },
      { id: 3, name: '家电清洗', icon: '/images/icons/appliance.png', bgColor: '#F6FFED' },
      { id: 4, name: '家庭除螨', icon: '/images/icons/mite.png', bgColor: '#FFF0F6' },
      { id: 5, name: '月嫂育儿', icon: '/images/icons/nanny.png', bgColor: '#F9F0FF' },
      { id: 6, name: '家居保养', icon: '/images/icons/maintenance.png', bgColor: '#E6FFFB' },
      { id: 7, name: '搬家服务', icon: '/images/icons/moving.png', bgColor: '#FFFBE6' },
      { id: 8, name: '更多服务', icon: '/images/icons/more.png', bgColor: '#F5F5F5' }
    ],

    // 最新活动数据
    activityList: [
      {
        id: 1,
        title: '日常保洁3小时',
        price: '99',
        originalPrice: '159',
        desc: '首单特惠价',
        tag: '限时',
        image: 'https://picsum.photos/300/200?random=4'
      },
      {
        id: 2,
        title: '空调深度清洗',
        price: '129',
        originalPrice: '199',
        desc: '高温杀菌消毒',
        tag: '热销',
        image: 'https://picsum.photos/300/200?random=5'
      },
      {
        id: 3,
        title: '油烟机清洗',
        price: '149',
        originalPrice: '229',
        desc: '去油污除异味',
        tag: '新品',
        image: 'https://picsum.photos/300/200?random=6'
      }
    ],

    // 热门推荐数据
    recommendList: [
      {
        id: 1,
        title: '【好评爆款】全屋深度保洁4小时',
        tags: ['擦玻璃', '厨房清洁', '卫生间消毒'],
        price: '199',
        sales: '5682',
        image: 'https://picsum.photos/300/300?random=7'
      },
      {
        id: 2,
        title: '【开荒保洁】新房装修后首次清洁',
        tags: ['除甲醛', '全屋清洁', '玻璃擦拭'],
        price: '399',
        sales: '2341',
        image: 'https://picsum.photos/300/300?random=8'
      },
      {
        id: 3,
        title: '【家电清洗】空调+油烟机套餐',
        tags: ['高温杀菌', '深度拆洗', '除味消毒'],
        price: '268',
        sales: '1893',
        image: 'https://picsum.photos/300/300?random=9'
      }
    ]
  },

  onLoad(options) {
    // 页面加载时执行初始化
    console.log('首页加载完成');
  },

  onShow() {
    // 页面显示时触发
    this.loadData();
  },

  // 加载数据
  loadData() {
    // 这里可以添加实际的API请求逻辑
    wx.showLoading({
      title: '加载中...',
    });
    
    // 模拟网络请求
    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  },

  // 查看更多分类
  viewMoreCategory() {
    wx.showToast({
      title: '查看全部服务',
      icon: 'none'
    });
  },

  // 选择分类
  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.data.categoryList.find(item => item.id === categoryId);
    
    wx.showToast({
      title: `选择了：${category.name}`,
      icon: 'none'
    });
  },

  // 查看更多活动
  viewMoreActivity() {
    wx.showToast({
      title: '查看全部活动',
      icon: 'none'
    });
  },

  // 选择活动
  selectActivity(e) {
    const activityId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${activityId}`
    });
  },

  // 选择推荐服务
  selectRecommend(e) {
    const recommendId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${recommendId}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '拾家有方 - 您的专业家政服务平台',
      path: '/pages/index/index',
      imageUrl: 'https://picsum.photos/500/400?random=10'
    };
  }
});
