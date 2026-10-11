<template>
  <view>
    <view class="tabs">
      <view :class="['tab', currentStatus === undefined ? 'active' : '']" @click="setStatus()">全部</view>
      <view v-for="t in tabs" :key="t.value" :class="['tab', currentStatus === t.value ? 'active' : '']" @click="setStatus(t.value)">{{ t.label }}</view>
    </view>
    <view class="list">
      <view class="card" v-for="o in list" :key="o.id" @click="goDetail(o)">
        <view class="head">
          <text class="no">{{ o.order_no }}</text>
          <text class="status">{{ statusText(o.status) }}</text>
        </view>
        <view class="body">
          <view class="name">{{ o.service_name }}</view>
          <view class="time">{{ o.book_date }} {{ o.book_time }}</view>
        </view>
        <view class="foot">
          <text class="price">¥{{ o.total_amount }}</text>
        </view>
      </view>
      <view v-if="list.length === 0" class="empty">暂无订单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../utils/request';
import { getOrderStatusText } from '../order/order-list-utils.mjs';

const tabs = [
  { value: 10, label: '待支付' },
  { value: 20, label: '待接单' },
  { value: 30, label: '待上门' },
  { value: 40, label: '服务中' },
  { value: 60, label: '待付尾款' },
  { value: 80, label: '已完成' },
];
const list = ref<any[]>([]);
const currentStatus = ref<number | undefined>(undefined);

const load = async () => {
  const params: any = {};
  if (currentStatus.value !== undefined) params.status = currentStatus.value;
  const r: any = await api.myOrders(params);
  list.value = r.list;
};
onShow(load);

const setStatus = (s?: number) => { currentStatus.value = s; load(); };
const statusText = (s: number) => getOrderStatusText(s);
const goDetail = (o: any) => uni.navigateTo({ url: `/pages/order-detail/order-detail?id=${o.id}` });
</script>

<style lang="scss">
@use '../../styles/variables.scss' as *;

.tabs { display: flex; background: $color-white; overflow-x: auto; white-space: nowrap; padding: 20rpx; }
.tab { flex: 0 0 auto; padding: 12rpx 24rpx; font-size: 26rpx; color: $text-neutral-secondary; border-radius: 24rpx; margin-right: 12rpx; background: $bg-grey; }
.tab.active { background: $color-primary; color: $color-white; }
.card { background: $color-white; border-radius: 16rpx; padding: 24rpx; margin: 16rpx 24rpx; }
.head { display: flex; justify-content: space-between; font-size: 24rpx; color: $text-light; }
.status { color: $color-primary; }
.body { padding: 16rpx 0; }
.name { font-size: 30rpx; color: $text-neutral-strong; font-weight: 500; }
.time { font-size: 26rpx; color: $text-neutral-secondary; margin-top: 8rpx; }
.foot { text-align: right; }
.price { color: $color-primary; font-size: 32rpx; font-weight: bold; }
.empty { text-align: center; padding: 100rpx; color: $text-light; }
</style>
