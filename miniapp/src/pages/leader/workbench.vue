<template>
  <view class="workbench-page">
    <view class="page-header">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">领队工作台</view>
      <view></view>
    </view>

    <view class="header">
      <view class="welcome">您好，{{ leaderName }}</view>
      <view class="today">今日订单 {{ profile?.todayCount || 0 }} 单</view>
    </view>
    <view class="stat">
      <view class="stat-item"><view class="num">{{ profile?.pendingArrive || 0 }}</view><view class="label">待上门</view></view>
      <view class="stat-item"><view class="num">{{ profile?.inService || 0 }}</view><view class="label">服务中</view></view>
      <view class="stat-item"><view class="num">{{ profile?.pendingFinal || 0 }}</view><view class="label">待尾款</view></view>
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view class="title">我的订单</view>
    <view class="card" v-for="o in list" :key="o.id" @click="goDetail(o)">
      <view class="head"><text>{{ o.order_no }}</text><text class="status">{{ statusText(o.status) }}</text></view>
      <view class="name">{{ o.service_name }}</view>
      <view class="time">{{ o.book_date }} {{ o.book_time }}</view>
    </view>
    <view v-if="list.length === 0" class="empty">暂无订单</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../utils/request';
import { isLogin, isLeader, getLeaderEmployee, refreshProfile } from '../../utils/auth';
import { getWorkbenchBackAction, runBackAction } from './page-utils.mjs';

const tabs = [
  { key: 'pendingDoor', label: '待上门', status: 30 },
  { key: 'inService', label: '服务中', status: 40 },
  { key: 'pendingFinal', label: '待尾款', status: 60 },
  { key: 'completed', label: '已完成', status: 80 },
  { key: 'cancelled', label: '已取消', status: 90 },
];

// 领队信息（来自 wxLogin 返回的 leaderEmployee 标识）
const leaderInfo = ref(getLeaderEmployee());
const leaderName = computed(() => leaderInfo.value?.name || '领队');

const profile = ref<any>(null);
const list = ref<any[]>([]);
const activeTab = ref('pendingDoor');

const loadOrders = async () => {
  const currentTab = tabs.find((item) => item.key === activeTab.value) || tabs[0];
  const response: any = await api.leaderOrders({ status: currentTab.status });
  list.value = response.list || [];
};

onShow(async () => {
  // 校验登录态与领队身份
  if (!isLogin()) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 1000);
    return;
  }
  if (!isLeader()) {
    uni.showToast({ title: '您不是领队，无法访问工作台', icon: 'none', duration: 2000 });
    setTimeout(() => uni.navigateBack(), 1500);
    return;
  }

  try {
    await refreshProfile();
    leaderInfo.value = getLeaderEmployee();
    profile.value = await api.leaderProfile();
    await loadOrders();
  } catch (e) {
    // request 拦截器已处理错误
  }
});

const switchTab = async (tabKey: string) => {
  if (activeTab.value === tabKey) return;
  activeTab.value = tabKey;
  await loadOrders();
};

const statusText = (s: number) => ({ 30:'待上门', 40:'服务中', 60:'待付尾款', 80:'已完成', 90:'已取消' } as any)[s] || '';
const goDetail = (o: any) => uni.navigateTo({ url: `/pages/leader/order?id=${o.id}` });
const goBack = () => {
  const stackSize = typeof getCurrentPages === 'function' ? getCurrentPages().length : 1;
  runBackAction(getWorkbenchBackAction(stackSize));
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.workbench-page {
  min-height: 100vh;
  background: $bg-cream;
}

.header {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: $color-white;
  padding: 60rpx 40rpx 96rpx;
}

.welcome {
  font-size: 36rpx;
  font-weight: 700;
}

.today {
  font-size: 26rpx;
  margin-top: 12rpx;
  opacity: 0.9;
}

.stat {
  display: flex;
  background: $bg-paper;
  margin: -40rpx 24rpx 0;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 8rpx 24rpx $overlay-card-soft;
  position: relative;
  z-index: 1;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.num {
  font-size: 48rpx;
  color: $color-primary;
  font-weight: 700;
}

.label {
  font-size: 24rpx;
  color: $text-light;
}

.tabs {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  overflow-x: auto;
}

.tab-item {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: $bg-paper;
  color: $text-light;
  font-size: 26rpx;
  border: 1px solid $line-light;
}

.tab-item.active {
  color: $color-white;
  background: $color-primary;
  border-color: $color-primary;
}

.title {
  font-size: 32rpx;
  font-weight: 700;
  padding: 0 24rpx 8rpx;
  color: $text-dark;
}

.card {
  background: $bg-paper;
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 16rpx 24rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: $text-light;
}

.status {
  color: $color-primary;
}

.name {
  font-size: 30rpx;
  color: $text-dark;
  font-weight: 600;
  margin: 12rpx 0 8rpx;
}

.time {
  font-size: 26rpx;
  color: $text-muted;
}

.empty {
  text-align: center;
  padding: 100rpx;
  color: $text-light;
}
</style>

