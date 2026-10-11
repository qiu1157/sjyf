<template>
  <view class="coupon page-container">
    <!-- 顶部导航栏 -->
    <view class="page-header" style="position: sticky; top: 0; z-index: 100;">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">我的优惠券</view>
      <view></view>
    </view>

    <!-- 优惠券列表 -->
    <view class="coupon-list">
      <view class="coupon-item" v-for="item in couponList" :key="item.id">
        <view class="coupon-left">
          <view class="coupon-amount">
            <text class="currency">¥</text>
            <text class="value">{{ item.amount }}</text>
          </view>
          <view class="coupon-condition">{{ item.condition }}</view>
        </view>
        <view class="coupon-right">
          <view class="coupon-name">{{ item.name }}</view>
          <view class="coupon-desc mini muted">{{ item.desc }}</view>
          <view class="coupon-expire mini muted">{{ item.expire }}</view>
          <view class="coupon-btn" v-if="item.status === 'usable'">立即使用</view>
          <view class="coupon-btn used" v-else-if="item.status === 'used'">已使用</view>
          <view class="coupon-btn expired" v-else>已过期</view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="couponList.length === 0">
      <text class="empty-icon">🎫</text>
      <text class="empty-text">暂无可用优惠券</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 优惠券列表
const couponList = ref([
  {
    id: 1,
    name: '新用户无门槛券',
    desc: '自动赠送 · 适用于所有服务',
    condition: '无门槛',
    amount: 50,
    expire: '有效期至 2026.12.31',
    status: 'usable'
  },
  {
    id: 2,
    name: '满599减80',
    desc: '用户自主领取 · 清洁服务专用',
    condition: '满599可用',
    amount: 80,
    expire: '有效期至 2026.08.31',
    status: 'usable'
  }
]);

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.coupon {
  padding-bottom: 40px;
}

// 优惠券列表
.coupon-list {
  padding: $spacing-base;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.coupon-item {
  display: flex;
  background: $bg-paper;
  border-radius: $radius-lg;
  overflow: hidden;
  border: 1px solid $line-color;
  transition: all 0.2s;

  &:active {
    transform: scale(0.99);
    opacity: 0.95;
  }
}

// 左侧金额区
.coupon-left {
  width: 110px;
  background: $gradient-card;
  padding: $spacing-lg $spacing-base;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 60%;
    background: repeating-linear-gradient(
      to bottom,
      $line-dashed-warm 0,
      $line-dashed-warm 4px,
      transparent 4px,
      transparent 8px
    );
  }
}

.coupon-amount {
  display: flex;
  align-items: flex-start;
  color: $color-primary;
  font-weight: $font-weight-black;
}

.currency {
  font-size: $font-size-base;
  margin-top: 4px;
}

.value {
  font-size: 36px;
  line-height: 1;
}

.coupon-condition {
  font-size: $font-size-xs;
  color: $text-body;
  margin-top: 4px;
}

// 右侧信息区
.coupon-right {
  flex: 1;
  padding: $spacing-lg $spacing-base $spacing-base;
  display: flex;
  flex-direction: column;
}

.coupon-name {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $text-dark;
}

.coupon-desc {
  margin-top: 4px;
}

.coupon-expire {
  margin-top: auto;
  padding-top: $spacing-sm;
}

.coupon-btn {
  align-self: flex-end;
  background: $gradient-btn;
  color: $color-white;
  font-size: $font-size-xs;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  margin-top: $spacing-sm;

  &.used {
    background: $bg-neutral-soft;
    color: $text-light;
  }

  &.expired {
    background: $bg-neutral-soft;
    color: $text-light;
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .empty-text {
    font-size: 14px;
    color: $text-muted;
  }
}
</style>

