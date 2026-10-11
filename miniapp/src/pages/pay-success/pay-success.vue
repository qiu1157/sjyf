<template>
  <view class="pay-success page-container">
    <!-- 成功图标区 -->
    <view class="success-section">
      <view class="success-icon">✓</view>
      <view class="success-title">支付成功</view>
      <view class="success-desc">主管将在确认订单后安排服务方案</view>
    </view>

    <!-- 订单信息卡片 -->
    <view class="mx-base mb-md">
      <view class="card card-padding">
        <view class="row mb-md">
          <text class="mini muted">当前状态</text>
          <view class="badge badge-orange">待主管接单</view>
        </view>
        <view class="row mb-md">
          <text class="mini muted">订单编号</text>
          <text class="bold">SH202606180091</text>
        </view>
        <view class="row">
          <text class="mini muted">预约时间</text>
          <text class="bold">6月18日 09:00</text>
        </view>
      </view>
    </view>

    <!-- 服务通知提醒 -->
    <view class="mx-base mb-md">
      <view class="card card-padding notice-card">
        <view class="bold">服务通知已开启</view>
        <view class="mini muted mt-sm">接单、改期、完工和退款将通过微信服务通知提醒你。</view>
      </view>
    </view>

    <!-- 底部操作按钮 -->
    <view class="bottom-bar">
      <view class="btn btn-ghost" style="flex: 1;" @click="goHome">取消订单</view>
      <view class="btn" style="flex: 2;" @click="goOrder">查看订单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 返回首页
const goHome = () => {
  uni.showModal({
    title: '提示',
    content: '确定要取消订单吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '订单已取消', icon: 'none' });
      }
    }
  });
};

// 查看订单
const goOrder = () => {
  uni.switchTab({ url: '/pages/order/order' });
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.pay-success {
  padding-bottom: 100px;
}

// 成功状态区
.success-section {
  text-align: center;
  padding: 54px 0 34px;
}

.success-icon {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: $bg-success-soft;
  color: $state-success;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  font-weight: bold;
  margin: 0 auto 22px;
}

.success-title {
  font-size: 26px;
  font-weight: $font-weight-black;
  color: $text-primary;
  margin-bottom: 8px;
}

.success-desc {
  font-size: $font-size-base;
  color: $text-secondary;
}

.notice-card {
  background: $bg-warning-soft;
}
</style>

