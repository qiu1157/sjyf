<template>
  <view class="category">
    <!-- 顶部导航栏（保持现有 page-header 结构） -->
    <view class="page-header">
      <view class="header-title">{{ currentTitle }}</view>
      <view class="header-btn">⋯</view>
    </view>

    <!-- 左右分栏容器 -->
    <view class="category-body">
    <!-- 左侧品类菜单 -->
    <view class="cat-menu-wrap">
      <scroll-view
        class="cat-menu"
        scroll-y
        :scroll-into-view="scrollIntoId"
        :scroll-with-animation="true"
      >
        <view v-if="categoriesLoading && categories.length === 0" class="state-tip">
          <text>加载中...</text>
        </view>
        <view
          v-for="item in categories"
          :key="item.id"
          :id="'cat-' + item.id"
          :class="['cat-menu-item', { active: item.id === activeCategoryId }]"
          @click="onSelectCategory(item)"
        >
          <image
            v-if="resolveImg(item.icon)"
            class="cat-icon"
            :src="resolveImg(item.icon)"
            mode="aspectFit"
          />
          <view v-else class="cat-icon cat-icon-placeholder">
            <text class="cat-icon-text">{{ placeholderChar(item.name) }}</text>
          </view>
          <text class="cat-name">{{ item.name }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 右侧服务列表 -->
    <view class="service-pane">
      <view v-if="serviceLoading && services.length === 0" class="state-tip">
        <text>加载中...</text>
      </view>

      <template v-else-if="services.length > 0">
        <view
          v-for="item in services"
          :key="item.id"
          class="service-card"
          @click="goDetail(item)"
        >
          <image
            v-if="resolveImg(item.thumbnail_image || item.cover_image)"
            class="service-thumb"
            :src="resolveImg(item.thumbnail_image || item.cover_image)"
            mode="aspectFill"
          />
          <view v-else class="service-thumb service-thumb-placeholder">
            <text class="service-thumb-text">{{ placeholderChar(item.name) }}</text>
          </view>

          <view class="service-info">
            <text class="service-name line-clamp-2">{{ item.name }}</text>
            <view class="service-price">
              <template v-if="hasPromo(item)">
                <text class="price-original">¥{{ formatPrice(item.price) }}</text>
                <text class="price-promo">¥{{ formatPrice(item.promo_price) }}</text>
              </template>
              <text v-else class="price-current">¥{{ formatPrice(item.price) }}</text>
            </view>
          </view>

          <view class="book-btn" @click.stop="goDetail(item)">立即预约</view>
        </view>
      </template>

      <view v-else class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无服务</text>
      </view>

      <view class="pane-bottom-space"></view>
    </view>
    </view>
    <!-- /category-body -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { resolveAssetUrl } from '../../utils/config';
import { api } from '../../utils/request';

interface CategoryItem {
  id: number;
  name: string;
  icon?: string | null;
}

interface ServiceItem {
  id: number;
  name: string;
  thumbnail_image?: string | null;
  cover_image?: string | null;
  price: number | string;
  promo_price?: number | string | null;
  category_id?: number;
  category_name?: string;
}

// 品类与服务数据
const categories = ref<CategoryItem[]>([]);
const services = ref<ServiceItem[]>([]);
const activeCategoryId = ref<number | null>(null);
// 初始即为加载态，避免首帧先闪「暂无服务」再变为「加载中」
const categoriesLoading = ref(true);
const serviceLoading = ref(true);

// 非 tabBar 跳转（navigateTo）场景下的初始品类参数
const initialCategoryId = ref<number | null>(null);

onLoad((options: any) => {
  if (options && options.categoryId) {
    initialCategoryId.value = Number(options.categoryId);
  }
});

onShow(() => {
  // 首页通过 switchTab + storage 传递品类筛选，取出后立即消费
  const filter = uni.getStorageSync('categoryFilter');
  let targetId: number | null = null;
  if (filter && filter.categoryId) {
    targetId = Number(filter.categoryId);
    uni.removeStorageSync('categoryFilter');
  } else if (initialCategoryId.value) {
    targetId = initialCategoryId.value;
  }
  // 每次进入页面重新拉取品类（准实时同步），再解析选中项与服务列表
  loadCategories().then(() => {
    resolveActiveCategory(targetId);
    loadServices();
  });
});

onPullDownRefresh(async () => {
  // 下拉刷新：重新请求品类 + 当前品类服务，完成后停止刷新动画
  await loadCategories();
  resolveActiveCategory(activeCategoryId.value);
  await loadServices();
  uni.stopPullDownRefresh();
});

// 拉取上架品类列表（接口已过滤 status=1 且 is_deleted=0）
const loadCategories = async (): Promise<void> => {
  categoriesLoading.value = true;
  try {
    const list = await api.categories<CategoryItem[]>();
    categories.value = Array.isArray(list) ? list : [];
  } catch (e) {
    categories.value = [];
  } finally {
    categoriesLoading.value = false;
  }
};

// 解析当前选中品类：目标有效用目标，否则保留已选，再否则回退第一个
const resolveActiveCategory = (targetId: number | null): void => {
  const exists = (id: number | null): boolean =>
    !!id && categories.value.some((c) => c.id === id);
  if (exists(targetId)) {
    activeCategoryId.value = targetId;
  } else if (exists(activeCategoryId.value)) {
    return;
  } else if (categories.value.length > 0) {
    activeCategoryId.value = categories.value[0].id;
  } else {
    activeCategoryId.value = null;
  }
};

// 拉取当前品类下的上架服务列表
const loadServices = async (): Promise<void> => {
  if (!activeCategoryId.value) {
    services.value = [];
    return;
  }
  serviceLoading.value = true;
  try {
    const list = await api.serviceList<ServiceItem[]>({ categoryId: activeCategoryId.value });
    services.value = Array.isArray(list) ? list : [];
  } catch (e) {
    services.value = [];
  } finally {
    serviceLoading.value = false;
  }
};

// 切换左侧品类
const onSelectCategory = (item: CategoryItem) => {
  if (item.id === activeCategoryId.value) return;
  activeCategoryId.value = item.id;
  loadServices();
};

// 顶部标题：当前品类名，无选中时兜底
const currentTitle = computed(() => {
  const cur = categories.value.find((c) => c.id === activeCategoryId.value);
  return cur?.name || '服务分类';
});

// 左侧菜单滚动锚点：跟随选中项自动滚动到位
const scrollIntoId = computed(() =>
  activeCategoryId.value ? 'cat-' + activeCategoryId.value : '',
);

// 图片地址解析：空返回空串；已是完整 URL 原样返回；相对路径拼接主机
const resolveImg = (path?: string | null): string => {
  if (!path) return '';
  return resolveAssetUrl(path);
};

// 占位字符：取名称首字，无名称时兜底
const placeholderChar = (name?: string | null): string => {
  const n = (name || '').trim();
  return n ? n.charAt(0) : '图';
};

// 促销价判定：promo_price > 0 且 < 原价
const hasPromo = (item: ServiceItem): boolean => {
  const promo = Number(item.promo_price || 0);
  const price = Number(item.price || 0);
  return promo > 0 && promo < price;
};

// 价格格式化：整数去小数，非整数保留两位
const formatPrice = (value: number | string): string => {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '0';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
};

// 跳转服务详情页（点击卡片或立即预约均进入详情，由详情页自行请求数据）
const goDetail = (item: ServiceItem) => {
  uni.navigateTo({
    url: '/pages/detail/detail?id=' + item.id,
  });
};
</script>

<style lang="scss" scoped>
@use '../../styles/variables.scss' as *;

.category {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $surface-page;
}

// 左右分栏容器
.category-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// 顶部导航栏
.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
  background: $bg-paper-soft;
  border-bottom: 1rpx solid $line-light;
}

.header-title {
  flex: 1;
  font-size: 36rpx;
  font-weight: 600;
  color: $text-primary;
}

.header-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: $text-secondary;
}

// 左侧品类菜单容器
.cat-menu-wrap {
  flex-shrink: 0;
  width: 180rpx;
  height: 100%;
  background: $bg-grey;
}

.cat-menu {
  width: 100%;
  height: 100%;
}

.cat-menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  box-sizing: border-box;
  // 预占左边框宽度，避免选中时布局抖动
  border-left: 4rpx solid transparent;
}

.cat-menu-item.active {
  background: $surface-card;
  border-left: 4rpx solid $color-primary;
}

.cat-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  margin-bottom: 8rpx;
}

.cat-icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-sand;
}

.cat-icon-text {
  font-size: 32rpx;
  color: $color-primary-dark;
  font-weight: 600;
}

.cat-name {
  font-size: 22rpx;
  color: $text-body;
  text-align: center;
  line-height: 1.25;
  word-break: break-all;
}

.cat-menu-item.active .cat-name {
  color: $color-primary;
  font-weight: 600;
}

// 右侧服务列表
.service-pane {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 20rpx 20rpx 0;
  box-sizing: border-box;
}

.service-card {
  display: flex;
  align-items: center;
  background: $bg-paper-soft;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: $shadow-light;
}

.service-thumb {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  background: $line-light;
}

.service-thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-thumb-text {
  font-size: 36rpx;
  color: $text-light;
  font-weight: 600;
}

.service-info {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-self: stretch;
}

// 两行省略
.line-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.service-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.4;
}

.service-price {
  margin-top: 12rpx;
  display: flex;
  align-items: baseline;
}

.price-original {
  font-size: 22rpx;
  color: $text-light;
  text-decoration: line-through;
  margin-right: 12rpx;
}

.price-promo {
  font-size: 36rpx;
  font-weight: 700;
  color: $state-error;
}

.price-current {
  font-size: 36rpx;
  font-weight: 700;
  color: $color-primary-dark;
}

.book-btn {
  flex-shrink: 0;
  margin-left: 16rpx;
  padding: 12rpx 24rpx;
  background: $color-primary;
  color: $color-white;
  font-size: 24rpx;
  border-radius: 999rpx;
  line-height: 1;
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}

.empty-icon {
  font-size: 96rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-light;
}

// 加载中提示
.state-tip {
  padding: 120rpx 0;
  text-align: center;
  color: $text-light;
  font-size: 26rpx;
}

// 底部留白，避免最后一张卡片紧贴屏幕底
.pane-bottom-space {
  height: 40rpx;
}
</style>
