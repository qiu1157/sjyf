<template>
  <view class="review page-container">
    <view class="card">
      <view class="title">服务评分</view>
      <view class="stars">
        <text v-for="n in 5" :key="n" :class="['star', n <= rating ? 'on' : '']" @click="rating = n">★</text>
      </view>
    </view>
    <view class="card">
      <view class="title">评价内容</view>
      <textarea v-model="content" placeholder="请分享您的服务感受" style="width:100%;font-size:28rpx;min-height:200rpx" />
    </view>
    <view class="footer">
      <view class="btn-primary" @click="submit">提交评价</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../utils/request';

const orderId = ref(0);
const rating = ref(5);
const content = ref('');

onLoad((opts: any) => { orderId.value = +opts.orderId; });

const submit = async () => {
  if (!content.value) return uni.showToast({ title: '请填写评价', icon: 'none' });
  await api.submitReview({ order_id: orderId.value, rating: rating.value, content: content.value });
  uni.showToast({ title: '评价成功' });
  setTimeout(() => uni.navigateBack(), 800);
};
</script>

<style lang="scss">
@use '../../styles/variables.scss' as *;

.card { background: $surface-card; border-radius: 16rpx; padding: 24rpx; margin: 24rpx; }
.title { font-size: 30rpx; font-weight: bold; margin-bottom: 20rpx; color: $text-primary; }
.stars { font-size: 60rpx; color: $border-default; }
.star.on { color: $color-yellow; }
.footer { padding: 24rpx; }
.btn-primary { background: $color-primary; color: $color-white; padding: 24rpx; border-radius: 12rpx; text-align: center; font-size: 30rpx; }
</style>
