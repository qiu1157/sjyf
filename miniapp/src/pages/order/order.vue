<template>
  <view class="order page-container">
    <view class="page-header">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">我的订单</view>
      <view class="header-tip">实时更新</view>
    </view>

    <scroll-view class="tab-bar mx-base" scroll-x show-scrollbar="false">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-pill"
        :class="{ active: currentTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </view>
    </scroll-view>

    <view v-if="loading" class="empty-state">
      <text class="empty-text">订单加载中...</text>
    </view>

    <view v-else-if="orders.length" class="list-wrap">
      <view
        v-for="item in orders"
        :key="item.id"
        class="card card-padding order-card mx-base mb-md"
        @click="goDetail(item)"
      >
        <view class="row mb-sm">
          <view class="order-no">订单号 {{ item.order_no }}</view>
          <view class="status-tag" :class="`status-${getOrderStatusTagType(item.status)}`">
            {{ getOrderStatusText(item.status) }}
          </view>
        </view>
        <view class="service-name">{{ item.service_name }}</view>
        <view class="mini muted mt-sm">预约时间：{{ item.book_date }} {{ item.book_time }}</view>
        <view class="row mt-md">
          <view class="mini muted">点击查看订单详情与进度</view>
          <view class="price price-sm">¥{{ formatAmount(item.total_amount) }}</view>
        </view>
      </view>
    </view>
    <view v-else class="empty-state">
      <text class="empty-icon">📦</text>
      <text class="empty-text">当前分类暂无订单</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../utils/request';
import {
  ORDER_TABS,
  buildOrderQuery,
  getOrderStatusTagType,
  getOrderStatusText,
} from './order-list-utils.mjs';
import { getOrderPageBackAction } from './order-page-utils.mjs';

const tabs = ORDER_TABS;
const currentTab = ref('in_service');
const orders = ref<any[]>([]);
const loading = ref(false);

const loadOrders = async () => {
  loading.value = true;
  try {
    const result: any = await api.myOrders(buildOrderQuery(currentTab.value));
    orders.value = Array.isArray(result?.list) ? result.list : [];
  } finally {
    loading.value = false;
  }
};

const switchTab = (tabKey: string) => {
  if (currentTab.value === tabKey) return;
  currentTab.value = tabKey;
  loadOrders();
};

const goDetail = (item: any) => {
  uni.navigateTo({ url: `/pages/order-detail/order-detail?id=${item.id}` });
};

const goBack = () => {
  const stackSize = typeof getCurrentPages === 'function' ? getCurrentPages().length : 1;
  const action = getOrderPageBackAction(stackSize);

  if (action.type === 'navigateBack') {
    uni.navigateBack({ delta: action.delta || 1 });
    return;
  }

  uni.switchTab({ url: action.url });
};

const formatAmount = (amount: number | string) => Number(amount || 0).toFixed(2);

onShow(() => {
  loadOrders();
});
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.order {
  padding-bottom: 80px;
}

.header-tip {
  font-size: 24rpx;
  color: $text-muted;
}

.tab-bar {
  white-space: nowrap;
  padding-bottom: 12rpx;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 132rpx;
  padding: 16rpx 24rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  background: $bg-paper;
  color: $text-body;
  border: 1px solid $line-color;
  font-size: 26rpx;

  &.active {
    background: $color-primary;
    color: $color-white;
    border-color: $color-primary;
  }
}

.list-wrap {
  padding-top: 8rpx;
}

.order-card {
  display: block;
}

.order-no {
  font-size: 24rpx;
  color: $text-muted;
}

.service-name {
  font-size: 32rpx;
  color: $text-dark;
  font-weight: $font-weight-bold;
}

.status-tag {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: $font-weight-bold;
}

.status-warning {
  background: $bg-warning-soft;
  color: $color-warning-deep;
}

.status-primary {
  background: $bg-primary-soft;
  color: $color-primary;
}

.status-success {
  background: $bg-success-soft;
  color: $color-success-strong;
}

.status-default {
  background: $bg-neutral-soft;
  color: $text-neutral-secondary;
}

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

