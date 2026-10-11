<template>
  <view>
    <view class="user-box">
      <view class="avatar">{{ (user.nickname || 'U').slice(0, 1) }}</view>
      <view class="name">{{ user.nickname || '用户' }}</view>
      <view class="phone">{{ user.phone || '未绑定手机号' }}</view>
    </view>
    <view class="menu">
      <view class="item" @click="goAddress">📍 地址管理</view>
      <view class="item" @click="goCoupon">🎁 我的优惠券</view>
      <view class="item">📞 联系客服</view>
      <view class="item">👑 会员中心（即将推出）</view>
      <view class="item" @click="goLeader">🛠 切换到领队端</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const user = ref<any>({});
onMounted(() => { user.value = uni.getStorageSync('userInfo') || {}; });
const goAddress = () => uni.navigateTo({ url: '/pages/address/address' });
const goCoupon = () => uni.navigateTo({ url: '/pages/coupon/coupon' });
const goLeader = () => uni.navigateTo({ url: '/pages/leader/workbench' });
</script>

<style lang="scss">
@use '../../styles/variables.scss' as *;

.user-box { background: $gradient-hero; color: $color-white; padding: 80rpx 40rpx; text-align: center; }
.avatar { width: 120rpx; height: 120rpx; line-height: 120rpx; margin: 0 auto; background: $overlay-white-soft; border-radius: 50%; font-size: 60rpx; }
.name { font-size: 36rpx; font-weight: bold; margin-top: 20rpx; }
.phone { font-size: 26rpx; opacity: 0.8; margin-top: 8rpx; }
.menu { margin: 24rpx; background: $surface-card; border-radius: 16rpx; overflow: hidden; }
.item { padding: 28rpx; font-size: 30rpx; color: $text-neutral-strong; border-bottom: 1rpx solid $line-light; }
</style>
