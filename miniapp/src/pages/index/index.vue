<template>
  <view class="home">
    <!-- 第一层：走马灯海报 -->
    <swiper
      v-if="bannerList.length > 0"
      class="banner-swiper"
      :indicator-dots="true"
      :autoplay="true"
      :interval="3500"
      :duration="500"
      :circular="true"
      indicator-color="var(--token-banner-indicator)"
      indicator-active-color="var(--token-banner-indicator-active)"
    >
      <swiper-item v-for="item in bannerList" :key="item.id" @click="goDetail(item)">
        <view class="banner-item">
          <image
            class="banner-image"
            :src="resolveImg(item.banner_image || item.cover_image)"
            mode="aspectFill"
          />
        </view>
      </swiper-item>
    </swiper>

    <!-- 第二层：服务品类宫格 -->
    <view class="section" v-if="categories.length > 0">
      <view class="section-header">
        <text class="section-title">服务分类</text>
        <text class="section-more" @click="goCategory">全部 ›</text>
      </view>
      <swiper
        class="cat-swiper"
        :indicator-dots="categoryPages.length > 1"
        indicator-color="var(--token-category-indicator)"
        indicator-active-color="var(--token-category-indicator-active)"
        :autoplay="false"
        :circular="false"
        :duration="300"
      >
        <swiper-item v-for="(page, pageIdx) in categoryPages" :key="pageIdx">
          <view class="cat-grid">
            <view
              class="cat-item"
              v-for="item in page"
              :key="item.id"
              @click="selectCategory(item)"
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
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 第三层：最新活动专区 -->
    <view class="section" v-if="latestList.length > 0">
      <view class="section-header">
        <text class="section-title">最新活动</text>
      </view>
      <view class="vertical-list">
        <view
          class="vertical-card"
          v-for="item in latestList"
          :key="item.id"
          @click="goDetail(item)"
        >
          <image
            v-if="resolveImg(item.thumbnail_image || item.cover_image)"
            class="vertical-thumb"
            :src="resolveImg(item.thumbnail_image || item.cover_image)"
            mode="aspectFill"
          />
          <view v-else class="vertical-thumb vertical-thumb-placeholder">
            <text class="vertical-thumb-text">{{ placeholderChar(item.name) }}</text>
          </view>
          <view class="vertical-info">
            <text class="vertical-name line-clamp-2">{{ item.name }}</text>
            <view class="vertical-price">
              <template v-if="item.promo_price > 0">
                <text class="price-promo">¥{{ formatPrice(item.promo_price) }}</text>
                <text class="price-original">¥{{ formatPrice(item.price) }}</text>
              </template>
              <text v-else class="price-current">¥{{ formatPrice(item.price) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 第四层：热销专区 -->
    <view class="section section-last" v-if="hotList.length > 0">
      <view class="section-header">
        <text class="section-title">热销专区</text>
        <view class="badge badge-orange">限时特惠</view>
      </view>
      <view class="vertical-list">
        <view
          class="vertical-card"
          v-for="item in hotList"
          :key="item.id"
          @click="goDetail(item)"
        >
          <image
            v-if="resolveImg(item.thumbnail_image || item.cover_image)"
            class="vertical-thumb"
            :src="resolveImg(item.thumbnail_image || item.cover_image)"
            mode="aspectFill"
          />
          <view v-else class="vertical-thumb vertical-thumb-placeholder">
            <text class="vertical-thumb-text">{{ placeholderChar(item.name) }}</text>
          </view>
          <view class="vertical-info">
            <text class="vertical-name line-clamp-2">{{ item.name }}</text>
            <view class="vertical-price">
              <template v-if="item.promo_price > 0">
                <text class="price-promo">¥{{ formatPrice(item.promo_price) }}</text>
                <text class="price-original">¥{{ formatPrice(item.price) }}</text>
              </template>
              <text v-else class="price-current">¥{{ formatPrice(item.price) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态：所有数据都为空 -->
    <view class="home-empty" v-if="!loading && bannerList.length === 0 && categories.length === 0 && latestList.length === 0 && hotList.length === 0">
      <text class="empty-icon">📭</text>
      <text class="empty-text">暂无服务数据</text>
    </view>

    <!-- 底部安全区占位 -->
    <view class="bottom-placeholder"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onPullDownRefresh } from '@dcloudio/uni-app';
import { resolveAssetUrl } from '../../utils/config';
import { api } from '../../utils/request';

const bannerList = ref<any[]>([]);
const categories = ref<any[]>([]);
const latestList = ref<any[]>([]);
const hotList = ref<any[]>([]);
const loading = ref(false);

const categoryPages = computed(() => {
  const pages: any[][] = [];
  const size = 8;
  for (let i = 0; i < categories.value.length; i += size) {
    pages.push(categories.value.slice(i, i + size));
  }
  return pages;
});

const resolveImg = (url: string) => {
  if (!url) return '';
  return resolveAssetUrl(url);
};

const placeholderChar = (name: string) => {
  return name ? name.charAt(0) : '?';
};

const formatPrice = (val: any) => {
  const n = Number(val);
  return isNaN(n) ? '0.00' : n.toFixed(2);
};

const loadData = async () => {
  loading.value = true;
  try {
    const [b, c, l, h] = await Promise.all([
      api.banner(),
      api.categories(),
      api.latest(),
      api.hot(),
    ]);
    bannerList.value = b || [];
    categories.value = c || [];
    latestList.value = l || [];
    hotList.value = h || [];
  } catch (e) {
    // request 拦截器已 showToast
  } finally {
    loading.value = false;
  }
};

onPullDownRefresh(async () => {
  await loadData();
  uni.stopPullDownRefresh();
});

loadData();

const goCategory = () => {
  uni.switchTab({ url: '/pages/category/category' });
};

const selectCategory = (item: any) => {
  uni.setStorageSync('categoryFilter', {
    categoryId: item.id,
    categoryName: item.name,
  });
  uni.switchTab({ url: '/pages/category/category' });
};

const goDetail = (item: any) => {
  uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}` });
};
</script>

<style lang="scss" scoped>
@use '../../styles/variables.scss' as *;
.home {
  min-height: 100vh;
  background: $surface-page;
}

// 走马灯
.banner-swiper {
  width: 100%;
  height: 360rpx;
}

.banner-item {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
}

// 通用区块
.section {
  margin: 40rpx 32rpx 0;
}

.section-last {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: 600;
  color: $text-primary;
}

.section-more {
  font-size: 26rpx;
  color: $text-secondary;
}

// 品类宫格 swiper 分页（每页8个，4列×2行）
.cat-swiper {
  width: 100%;
  height: 380rpx;
}

.cat-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 8rpx;
}

.cat-item {
  width: 25%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 8rpx;
}

.cat-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: $bg-grey;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.cat-icon-placeholder {
  background: $gradient-card;
}

.cat-icon-text {
  font-size: 36rpx;
  color: $color-primary;
  font-weight: 600;
}

.cat-name {
  font-size: 24rpx;
  color: $text-primary;
  text-align: center;
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 纵向列表（最新活动+热销）
.vertical-list {
  display: flex;
  flex-direction: column;
}

.vertical-card {
  display: flex;
  background: $bg-paper-soft;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: $shadow-light;
}

.vertical-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  margin-right: 24rpx;
}

.vertical-thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $gradient-card;
}

.vertical-thumb-text {
  font-size: 48rpx;
  color: $color-primary;
  font-weight: 600;
}

.vertical-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.vertical-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.vertical-price {
  display: flex;
  align-items: baseline;
}

.price-promo {
  font-size: 40rpx;
  font-weight: 700;
  color: $color-warning-strong;
  margin-right: 12rpx;
}

.price-original {
  font-size: 24rpx;
  color: $text-light;
  text-decoration: line-through;
}

.price-current {
  font-size: 40rpx;
  font-weight: 700;
  color: $color-primary;
}

// 徽章
.badge {
  display: inline-flex;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 1;
}

.badge-orange {
  background: $bg-tag-orange;
  color: $color-orange;
}

// 空状态
.home-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-light;
}

// 底部占位
.bottom-placeholder {
  height: 80rpx;
}
</style>

