<template>
  <view class="page">
    <view class="card">
      <view class="title">验收提交</view>
      <view class="row">
        <text>计划工时</text>
        <text>{{ summary.plan_hours }} 小时</text>
      </view>
      <view class="row">
        <text>实际方案工时</text>
        <input
          :value="planActualHoursInput"
          type="digit"
          class="input"
          placeholder="请输入实际方案工时"
          @input="onPlanActualInput"
        />
      </view>
      <view class="row">
        <text>增项工时</text>
        <input
          :value="extraActualHoursInput"
          type="digit"
          class="input"
          placeholder="请输入增项工时"
          @input="onExtraActualInput"
        />
      </view>
      <view class="row">
        <text>实际总工时</text>
        <text>{{ summary.actual_hours }} 小时</text>
      </view>
      <view class="row">
        <text>工时差异</text>
        <text :class="diffClass">{{ diffText }}</text>
      </view>
    </view>

    <view class="hint">两个工时都填写后才可提交，支持填写 0。</view>

    <view class="footer">
      <view class="btn-primary submit-btn" :class="{ disabled: !canSubmit }" @click="submit">提交验收</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../utils/request';
import {
  buildAcceptanceSummary,
  canSubmitAcceptance,
  normalizeAcceptanceHours,
} from './acceptance-utils.mjs';

const id = ref(0);
const planHours = ref(0);
const planActualHoursInput = ref<string | number>('');
const extraActualHoursInput = ref<string | number>('');

onLoad(async (opts: any) => {
  id.value = +opts.id;
  const d: any = await api.leaderOrderDetail(id.value);
  planHours.value = +d.order.plan_hours || 0;
});

const planActualHours = computed(() => normalizeAcceptanceHours(planActualHoursInput.value));
const extraActualHours = computed(() => normalizeAcceptanceHours(extraActualHoursInput.value));
const canSubmit = computed(() => canSubmitAcceptance(planActualHoursInput.value, extraActualHoursInput.value));
const summary = computed(() => buildAcceptanceSummary({
  planHours: planHours.value,
  planActualHours: planActualHours.value || 0,
  extraActualHours: extraActualHours.value || 0,
}));
const diffText = computed(() => `${summary.value.diff_hours > 0 ? '+' : ''}${summary.value.diff_hours.toFixed(1)} 小时`);
const diffClass = computed(() => (summary.value.diff_hours > 0 ? 'over' : summary.value.diff_hours < 0 ? 'less' : ''));

const onPlanActualInput = (event: any) => {
  planActualHoursInput.value = event?.detail?.value ?? '';
};

const onExtraActualInput = (event: any) => {
  extraActualHoursInput.value = event?.detail?.value ?? '';
};

const submit = async () => {
  if (!canSubmit.value || planActualHours.value === null || extraActualHours.value === null) {
    uni.showToast({ title: '请填写完整工时', icon: 'none' });
    return;
  }

  await api.acceptance(id.value, {
    plan_actual_hours: planActualHours.value,
    extra_actual_hours: extraActualHours.value,
  });
  uni.showToast({ title: '验收提交成功' });
  setTimeout(() => uni.navigateBack({ delta: 2 }), 800);
};
</script>

<style lang="scss">
@use '../../styles/variables.scss' as *;

.page {
  min-height: 100vh;
  padding-top: 24rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  color: $text-dark;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24rpx;
  padding: 18rpx 0;
  font-size: 28rpx;
  color: $text-neutral-strong;
  border-bottom: 1rpx solid $line-light;
}

.row:last-child {
  border-bottom: 0;
}

.input {
  width: 260rpx;
  border: 1rpx solid $line-color;
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  text-align: right;
  background: $bg-paper-soft;
}

.hint {
  margin: 0 24rpx;
  color: $text-warning;
  font-size: 24rpx;
}

.over {
  color: $color-danger-bright;
}

.less {
  color: $color-success-bright;
}

.footer {
  padding: 24rpx;
}

.submit-btn.disabled {
  opacity: 0.5;
}
</style>

