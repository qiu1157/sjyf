<template>
  <view v-if="detail" class="detail page-container">
    <view class="page-header">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">订单详情</view>
      <view class="header-btn header-btn-placeholder"></view>
    </view>
    <view class="status-bar">
      <view class="status">{{ statusText }}</view>
    </view>
    <view class="card">
      <view class="title">订单信息</view>
      <view class="row"><text>订单号</text><text>{{ order.order_no }}</text></view>
      <view class="row"><text>服务</text><text>{{ order.service_name }}</text></view>
      <view class="row"><text>预约</text><text>{{ order.book_date }} {{ order.book_time }}</text></view>
      <view class="row"><text>服务地址</text><text class="value-text">{{ displayAddress || '-' }}</text></view>
      <view class="row"><text>订单状态</text><text>{{ statusText }}</text></view>
    </view>
    <view class="card">
      <view class="title">费用明细</view>
      <view class="row"><text>服务价格</text><text>¥{{ feeSummary.service_price }}</text></view>
      <view class="row"><text>已付首款</text><text>¥{{ feeSummary.first_payment }} {{ order.first_pay_time ? '✓已付' : '未付' }}</text></view>
      <view class="row"><text>临时增项费用</text><text>¥{{ feeSummary.extra_amount }}</text></view>
      <view class="row"><text>待付尾款</text><text>¥{{ feeSummary.final_payment }} {{ order.final_pay_time ? '✓已付' : '未付' }}</text></view>
      <view class="row"><text class="bold">合计</text><text class="price">¥{{ order.total_amount }}</text></view>
    </view>

    <view class="card">
      <view class="title">订单进度</view>
      <view v-if="timeline.length" class="timeline">
        <view v-for="(item, index) in timeline" :key="`${item.title}-${index}`" class="timeline-item">
          <view class="timeline-dot"></view>
          <view class="timeline-content">
            <view class="timeline-title">{{ item.title }}</view>
            <view class="timeline-time">{{ formatTime(item.time) }}</view>
            <view class="timeline-desc">{{ item.desc }}</view>
          </view>
        </view>
      </view>
      <view v-else class="empty-block">暂无进度记录</view>
    </view>

    <view class="card">
      <view class="title">临时增项记录</view>
      <view v-if="adjustmentList.length" class="adjustment-list">
        <view v-for="item in adjustmentList" :key="item.id" class="adjustment-item">
          <view class="row">
            <text class="adjustment-title">{{ item.title }}</text>
            <text class="adjustment-amount">+¥{{ item.amount }}</text>
          </view>
          <view class="mini muted">{{ item.created_at }}</view>
          <view v-if="item.remark" class="adjustment-remark">备注：{{ item.remark }}</view>
        </view>
      </view>
      <view v-else class="empty-block">暂无临时增项记录</view>
    </view>
    <view class="footer">
      <view v-if="showFinalPayButton" class="btn-primary" @click="payFinal">支付尾款 ¥{{ order.final_payment }}</view>
      <view v-if="showCancelButton" class="btn-default" @click="cancel">取消订单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onLoad } from '@dcloudio/uni-app';
import { api } from '../../utils/request';
import { getOrderStatusText } from '../order/order-list-utils.mjs';
import { getOrderDetailBackAction } from '../order/order-page-utils.mjs';
import {
  CANCEL_REASON_OPTIONS,
  buildAdjustmentDisplayList,
  buildFeeSummary,
  getCancelSubmitMessage,
  getDisplayAddress,
  shouldShowCancelButton,
  shouldShowFinalPayButton,
} from './order-detail-utils.mjs';

const id = ref(0);
const detail = ref<any>(null);
const timeline = ref<any[]>([]);
const adjustments = ref<any[]>([]);
const order = computed(() => detail.value?.order);
const statusText = computed(() => {
  if (!order.value) return '';
  return getOrderStatusText(order.value.status);
});
const feeSummary = computed(() => buildFeeSummary(order.value || {}));
const displayAddress = computed(() => getDisplayAddress(order.value?.address_snapshot));
const adjustmentList = computed(() => buildAdjustmentDisplayList(adjustments.value));
const showFinalPayButton = computed(() => shouldShowFinalPayButton(order.value || {}));
const showCancelButton = computed(() => shouldShowCancelButton(order.value || {}));

onLoad((opts: any) => { id.value = +opts.id; });
onShow(async () => {
  if (!id.value) return;
  const [detailResult, timelineResult, adjustmentResult] = await Promise.all([
    api.orderDetail(id.value),
    api.orderTimeline(id.value),
    api.orderAdjustments(id.value),
  ]);
  detail.value = detailResult;
  timeline.value = Array.isArray(timelineResult) ? timelineResult : [];
  adjustments.value = Array.isArray(adjustmentResult) ? adjustmentResult : [];
});

const payFinal = async () => {
  await api.payFinal(id.value);
  uni.showToast({ title: '尾款支付成功' });
  setTimeout(() => { detail.value = null; uni.showLoading({ title: '' }); api.orderDetail(id.value).then((d) => { detail.value = d; uni.hideLoading(); }); }, 800);
};
const goBack = () => {
  const stackSize = typeof getCurrentPages === 'function' ? getCurrentPages().length : 1;
  const action = getOrderDetailBackAction(stackSize);

  if (action.type === 'navigateBack') {
    uni.navigateBack({ delta: action.delta || 1 });
    return;
  }

  uni.switchTab({ url: action.url });
};

const formatTime = (value: string | Date) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const cancel = () => {
  uni.showActionSheet({
    itemList: CANCEL_REASON_OPTIONS,
    success: async (res) => {
      const reason = CANCEL_REASON_OPTIONS[res.tapIndex];
      if (!reason) return;
      await api.cancelOrder(id.value, reason);
      uni.showToast({ title: getCancelSubmitMessage(order.value?.status) });
      setTimeout(() => goBack(), 600);
    },
  });
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.detail {
  padding-bottom: 40rpx;
}

.header-btn-placeholder {
  visibility: hidden;
}

.status-bar { background: linear-gradient(135deg, $color-primary, $color-primary-dark); color: $color-white; padding: 60rpx 40rpx; }
.status { font-size: 40rpx; font-weight: bold; }
.card { background: $color-white; border-radius: 16rpx; padding: 24rpx; margin: 24rpx; }
.title { font-size: 30rpx; font-weight: bold; margin-bottom: 16rpx; }
.row { display: flex; justify-content: space-between; gap: 24rpx; padding: 12rpx 0; font-size: 28rpx; color: $text-neutral-strong; }
.bold { font-weight: bold; }
.price { color: $color-primary; font-weight: bold; }
.value-text { flex: 1; text-align: right; color: $text-body; }
.timeline-item { display: flex; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid $line-light; }
.timeline-item:last-child { border-bottom: 0; }
.timeline-dot { width: 16rpx; height: 16rpx; border-radius: 50%; margin-top: 10rpx; background: $color-primary; flex-shrink: 0; }
.timeline-content { flex: 1; }
.timeline-title { font-size: 28rpx; color: $text-dark; font-weight: $font-weight-bold; }
.timeline-time { margin-top: 6rpx; font-size: 24rpx; color: $text-muted; }
.timeline-desc { margin-top: 6rpx; font-size: 24rpx; color: $text-body; }
.adjustment-item { padding: 18rpx 0; border-bottom: 1rpx solid $line-light; }
.adjustment-item:last-child { border-bottom: 0; }
.adjustment-title { flex: 1; color: $text-dark; }
.adjustment-amount { color: $color-primary; font-weight: $font-weight-bold; }
.adjustment-remark { margin-top: 8rpx; font-size: 24rpx; color: $text-muted; }
.empty-block { padding: 24rpx 0; font-size: 26rpx; color: $text-muted; text-align: center; }
.footer { padding: 24rpx; }
.btn-primary { background: $color-primary; color: $color-white; padding: 24rpx; border-radius: 12rpx; text-align: center; margin-bottom: 16rpx; font-size: 30rpx; }
.btn-default { background: $bg-grey; color: $text-body; padding: 24rpx; border-radius: 12rpx; text-align: center; font-size: 30rpx; }
</style>
