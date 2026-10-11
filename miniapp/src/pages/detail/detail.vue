<template>
  <view class="detail page-container">
    <!-- 顶部导航栏 -->
    <view class="page-header" style="position: sticky; top: 0; z-index: 100;">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">服务详情</view>
      <view class="header-btn">♡</view>
    </view>

    <!-- 下架/不存在提示页（US-028）-->
    <view v-if="isUnavailable" class="unavailable">
      <view class="unavailable-icon">📭</view>
      <view class="unavailable-text">该服务已下架/不存在</view>
      <view class="btn btn-brown btn-full unavailable-btn" @click="goBack">返回</view>
    </view>

    <!-- 服务详情内容 -->
    <template v-else-if="detail">
      <!-- Hero 区：封面图 + 服务名称 + 简介 -->
      <view class="hero-section">
        <image
          v-if="detail.cover_image"
          :src="detail.cover_image"
          class="hero-cover"
          mode="aspectFill"
        />
        <view class="hero-mask"></view>
        <view class="hero-info">
          <view class="hero-title">{{ detail.name }}</view>
          <view class="hero-desc" v-if="detail.description">{{ detail.description }}</view>
        </view>
      </view>

      <!-- 价格卡片：原价 + 促销价划线展示 + 服务时长 -->
      <view class="section mx-base">
        <view class="card card-padding">
          <view class="price-row">
            <text v-if="hasPromo" class="price-promo">¥{{ detail.promo_price }}</text>
            <text :class="['price', { 'price-origin': hasPromo }]">¥{{ detail.price }}</text>
          </view>
          <view class="mini muted mt-sm">服务时长 {{ detail.duration }} 分钟</view>
        </view>
      </view>

      <!-- 详情说明：rich-text 渲染 content -->
      <view class="section mx-base">
        <view class="section-title mb-md">服务包含</view>
        <view class="card card-padding">
          <rich-text v-if="detail.content" :nodes="detail.content" class="rich-content"></rich-text>
          <view v-else class="mini muted">暂无详细说明</view>
        </view>
      </view>

      <!-- 服务保障：保留 3 列 -->
      <view class="section mx-base">
        <view class="section-title mb-md">服务保障</view>
        <view class="grid-3">
          <view class="cat-item">
            <view class="cat-icon">👤</view>
            <text>实名人员</text>
          </view>
          <view class="cat-item">
            <view class="cat-icon">📋</view>
            <text>主管审核</text>
          </view>
          <view class="cat-item">
            <view class="cat-icon">✓</view>
            <text>验收确认</text>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <view class="btn btn-ghost" style="flex: 1;">咨询</view>
        <view class="btn" style="flex: 2;" @click="goBook">立即预约</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api, request } from '../../utils/request';

// 服务详情数据与页面状态
const serviceId = ref(0);
const detail = ref<any>(null);
// US-028：服务下架/删除时切换为提示页
const isUnavailable = ref(false);

// 是否有促销价：promo_price > 0 时展示划线原价 + 红色促销价
const hasPromo = computed(() => {
  return !!detail.value && Number(detail.value.promo_price) > 0;
});

// 页面加载：接收 id 参数并拉取服务详情
onLoad(async (options: any) => {
  const id = Number(options?.id);
  if (!id) {
    isUnavailable.value = true;
    return;
  }
  serviceId.value = id;
  await fetchDetail(id);
});

// 拉取服务详情，404 等异常归一为下架/不存在
const fetchDetail = async (id: number) => {
  try {
    detail.value = await api.serviceDetail(id);
  } catch (e) {
    // request.ts 内部已 showToast，这里仅切换到提示页
    isUnavailable.value = true;
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};

const buildConfirmUrl = () => `/pages/confirm/confirm?id=${serviceId.value}`;

const redirectToLogin = () => {
  uni.navigateTo({
    url: `/pages/login/login?redirect=${encodeURIComponent(buildConfirmUrl())}`,
  });
};

const ensureSession = async () => {
  const token = uni.getStorageSync('token');
  if (!token) return false;

  try {
    await request({ url: '/user/profile', silent401: true });
    return true;
  } catch (_) {
    return false;
  }
};

// 跳转预约页，携带服务 id；未登录时登录成功后直接回确认页
const goBook = async () => {
  if (!uni.getStorageSync('token')) {
    redirectToLogin();
    return;
  }

  const hasSession = await ensureSession();
  if (!hasSession) {
    redirectToLogin();
    return;
  }

  uni.navigateTo({ url: buildConfirmUrl() });
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.detail {
  padding-bottom: 100px;
}

.section {
  margin-top: $spacing-base;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

// 覆盖通用 hero 样式：封面图 + 文案叠加
.hero-section {
  margin: 0;
  height: 240px;
  border-radius: 0;
  background: $gradient-hero;
  padding: 0;
  position: relative;
  overflow: hidden;

  // 移除通用样式中的装饰圆点
  &::after {
    display: none;
  }
}

.hero-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

// 底部渐变遮罩，保证白色文案可读
.hero-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60%;
  background: linear-gradient(to top, $overlay-dark-70, transparent);
}

.hero-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: $spacing-lg;
  color: $neutral-0;
}

.hero-title {
  font-size: 24px;
  font-weight: $font-weight-black;
  line-height: 1.3;
}

.hero-desc {
  margin-top: 6px;
  font-size: $font-size-sm;
  color: $text-white-soft;
}

// 价格行：促销价红色 + 原价划线
.price-row {
  display: flex;
  align-items: baseline;
  gap: $spacing-sm;
}

.price-promo {
  color: $color-red;
  font-weight: $font-weight-black;
  font-size: $font-size-xl;
}

.price-origin {
  color: $text-light;
  font-size: $font-size-base;
  font-weight: $font-weight-normal;
  text-decoration: line-through;
}

.rich-content {
  font-size: $font-size-sm;
  line-height: 1.8;
  color: $text-body;
}

// 下架/不存在提示页
.unavailable {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px $spacing-xl 0;
}

.unavailable-icon {
  font-size: 64px;
  margin-bottom: $spacing-lg;
}

.unavailable-text {
  font-size: $font-size-lg;
  color: $text-secondary;
  margin-bottom: $spacing-xl;
}

.unavailable-btn {
  max-width: 200px;
}
</style>

