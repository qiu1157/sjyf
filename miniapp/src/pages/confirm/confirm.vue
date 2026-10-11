<template>
  <view class="confirm page-container" v-if="item">
    <view class="page-header" style="position: sticky; top: 0; z-index: 100;">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">确认订单</view>
      <view></view>
    </view>

    <view class="mx-base mb-md">
      <view class="card card-padding">
        <view class="bold">{{ item.name }}</view>
        <view class="mini muted mt-sm">{{ item.brief || item.description || '上门家政服务' }}</view>
        <view class="price mt-sm">¥{{ item.price }}</view>
      </view>
    </view>

    <view class="mx-base mb-md">
      <view class="card card-padding">
        <picker mode="date" :value="bookDate" :start="minDate" @change="onDate">
          <view class="row row-line">
            <view class="bold">服务日期</view>
            <view>{{ bookDate || '请选择日期' }} ›</view>
          </view>
        </picker>
        <picker :range="timeOptions" :value="timeIdx" @change="onTime">
          <view class="row">
            <view class="bold">服务时段</view>
            <view>{{ timeOptions[timeIdx] || '请选择时段' }} ›</view>
          </view>
        </picker>
      </view>
    </view>

    <view class="mx-base mb-md">
      <view class="card card-padding" @click="chooseAddress">
        <view class="row">
          <view class="bold">服务地址</view>
          <view>{{ address ? '切换地址' : '选择地址' }} ›</view>
        </view>
        <view v-if="address" class="addr mt-sm">
          <view class="mini muted">{{ address.contact_name }} {{ address.contact_phone }}</view>
          <view class="mini muted mt-xs">{{ address.full_address }}</view>
        </view>
        <view v-else class="mini address-empty mt-sm">
          请先选择服务地址
        </view>
      </view>
    </view>

    <view class="mx-base mb-md">
      <view class="card card-padding">
        <view class="bold mb-sm">备注说明</view>
        <textarea
          v-model="remark"
          class="remark-input"
          placeholder="可填写上门注意事项、停车说明等"
          maxlength="200"
        />
      </view>
    </view>

    <view class="mx-base mb-md">
      <view class="card card-padding">
        <view class="row mb-md">
          <text class="mini">服务价格</text>
          <text class="mini">¥{{ item.price }}</text>
        </view>
        <view class="row mb-md">
          <text class="mini">应付金额（首付款=全额）</text>
          <text class="mini">¥{{ firstPay }}</text>
        </view>
        <view class="row">
          <text class="mini">尾款</text>
          <text class="mini">¥0.00</text>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="btn" style="width: 100%;" @click="submit">
        {{ submitting ? '提交中...' : `${payMode === 'mock' ? '确认并模拟支付全款' : '确认并支付全款'} ¥${firstPay}` }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { api, request } from '../../utils/request';

const item = ref<any>(null);
const address = ref<any>(null);
const remark = ref('');
const serviceId = ref(0);
const bookDate = ref('');
const timeOptions = ['09:00-13:00', '13:00-17:00', '17:00-21:00'];
const timeIdx = ref(0);
const payMode = ref('mock');
const submitting = ref(false);
const hasManualSelectedAddress = ref(false);

const firstPay = computed(() => item.value ? Number(item.value.price).toFixed(2) : '0.00');
const minDate = computed(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
});

const buildConfirmUrl = () => `/pages/confirm/confirm?id=${serviceId.value}`;

// H5 登录失效时直接回登录页，避免停留在确认页反复提示“请重新登录”
const redirectToLogin = () => {
  if (!serviceId.value) return;
  uni.redirectTo({
    url: `/pages/login/login?redirect=${encodeURIComponent(buildConfirmUrl())}`,
  });
};

const ensureLogin = () => {
  if (uni.getStorageSync('token')) return true;
  redirectToLogin();
  return false;
};

const ensureSession = async () => {
  if (!ensureLogin()) return false;

  try {
    await request({ url: '/user/profile', silent401: true });
    return true;
  } catch (_) {
    redirectToLogin();
    return false;
  }
};

const pickHandler = (selected: any) => {
  address.value = selected;
  hasManualSelectedAddress.value = true;
};

const loadDefaultAddress = async () => {
  const list: any[] = await api.addresses();
  if (!list.length) {
    address.value = null;
    hasManualSelectedAddress.value = false;
    return;
  }

  if (hasManualSelectedAddress.value && address.value?.id) {
    const selected = list.find((entry) => entry.id === address.value.id);
    if (selected) {
      address.value = selected;
      return;
    }
  }

  address.value = list.find((entry) => entry.is_default === 1) || list[0] || null;
  hasManualSelectedAddress.value = false;
};

onLoad(async (options: any) => {
  serviceId.value = Number(options?.id || 0);
  item.value = await api.serviceDetail(serviceId.value);
  const mode: any = await request({ url: '/payment/mode', noAuth: true });
  payMode.value = mode.mode;
  uni.$on('address:selected', pickHandler);
});

onShow(async () => {
  if (!(await ensureSession())) return;
  try {
    await loadDefaultAddress();
  } catch (_) {
    if (!uni.getStorageSync('token')) {
      redirectToLogin();
    }
  }
});

onUnload(() => {
  uni.$off('address:selected', pickHandler);
});

const onDate = (event: any) => {
  bookDate.value = event.detail.value;
};

const onTime = (event: any) => {
  timeIdx.value = +event.detail.value;
};

const chooseAddress = async () => {
  if (!(await ensureSession())) return;
  uni.navigateTo({ url: '/pages/address/address?pick=1' });
};

const submit = async () => {
  if (!bookDate.value) {
    uni.showToast({ title: '请选择服务日期', icon: 'none' });
    return;
  }
  if (!address.value) {
    uni.showToast({ title: '请先选择服务地址', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    const order: any = await api.createOrder({
      service_item_id: item.value.id,
      book_date: bookDate.value,
      book_time: timeOptions[timeIdx.value],
      address_id: address.value.id,
      user_remark: remark.value,
    });
    await api.payFirst(order.id);
    uni.redirectTo({ url: `/pages/pay-success/pay-success?orderId=${order.id}` });
  } finally {
    submitting.value = false;
  }
};

const goBack = () => uni.navigateBack();
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.confirm {
  padding-bottom: 100px;
}

.row-line {
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid $line-light;
}

.mt-xs {
  margin-top: 4px;
}

.mt-sm {
  margin-top: 10px;
}

.address-empty {
  color: $state-error;
}

.remark-input {
  width: 100%;
  min-height: 150rpx;
  font-size: 28rpx;
}
</style>

