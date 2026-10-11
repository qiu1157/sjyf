<template>
  <view class="page-container address-edit">
    <view class="page-header">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">{{ form.id ? '编辑地址' : '新增地址' }}</view>
      <view></view>
    </view>

    <view class="mx-base mt-md">
      <view class="card card-padding">
        <view class="form-item">
          <view class="form-label">联系人姓名</view>
          <input
            :value="form.contact_name"
            class="form-input"
            placeholder="请输入真实联系人姓名"
            placeholder-class="form-placeholder"
            maxlength="32"
            @input="onContactNameInput"
          />
        </view>

        <view class="form-item">
          <view class="form-label row-between">
            <text>联系电话</text>
            <!-- #ifdef MP-WEIXIN -->
            <button class="phone-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
              微信授权手机号
            </button>
            <!-- #endif -->
          </view>
          <input
            :value="form.contact_phone"
            class="form-input"
            type="number"
            placeholder="请输入联系电话"
            placeholder-class="form-placeholder"
            maxlength="11"
            @input="onContactPhoneInput"
          />
        </view>

        <view class="form-item">
          <view class="form-label">省市区</view>
          <picker mode="region" :value="regionValue" @change="onRegionChange">
            <view class="picker-input">{{ regionText || '请选择省市区' }}</view>
          </picker>
        </view>

        <view class="form-item">
          <view class="form-label">详细地址</view>
          <textarea
            :value="form.detail"
            class="textarea-input"
            placeholder="请输入小区、楼栋、单元、门牌等详细地址"
            placeholder-class="form-placeholder"
            maxlength="256"
            @input="onDetailInput"
          />
        </view>

        <view class="default-row" @click="form.is_default = form.is_default === 1 ? 0 : 1">
          <view>
            <view class="form-label">设为默认地址</view>
            <view class="form-tip">下单时默认带出该地址</view>
          </view>
          <view class="default-check" :class="{ active: form.is_default === 1 }">{{ form.is_default === 1 ? '已设为默认' : '未设为默认' }}</view>
        </view>
      </view>
    </view>

    <view class="bottom-bar static-bar">
      <button class="btn action-btn" hover-class="none" @tap="submit">{{ submitting ? '保存中...' : '保存地址' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../utils/request';

const DEFAULT_REGION = {
  province: '湖南省',
  city: '长沙市',
  district: '浏阳市',
};

const submitting = ref(false);
const form = reactive({
  id: 0,
  contact_name: '',
  contact_phone: '',
  province: DEFAULT_REGION.province,
  city: DEFAULT_REGION.city,
  district: DEFAULT_REGION.district,
  detail: '',
  is_default: 0,
});

const regionValue = computed(() => [form.province || '', form.city || '', form.district || '']);
const regionText = computed(() => [form.province, form.city, form.district].filter(Boolean).join(' '));

const onContactNameInput = (event: any) => {
  form.contact_name = String(event?.detail?.value || '').trim();
};

const onContactPhoneInput = (event: any) => {
  form.contact_phone = String(event?.detail?.value || '').replace(/\s+/g, '');
};

const onDetailInput = (event: any) => {
  form.detail = String(event?.detail?.value || '').trim();
};

onLoad(async (options: any) => {
  if (!options?.id) return;
  const list: any[] = await api.addresses();
  const current = list.find((item) => +item.id === +options.id);
  if (!current) {
    uni.showToast({ title: '地址不存在', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }
  Object.assign(form, {
    id: current.id,
    contact_name: current.contact_name,
    contact_phone: current.contact_phone,
    province: current.province,
    city: current.city,
    district: current.district,
    detail: current.detail,
    is_default: current.is_default,
  });
});

const onRegionChange = (event: any) => {
  const [province, city, district] = event.detail.value || [];
  form.province = province || '';
  form.city = city || '';
  form.district = district || '';
};

const onGetPhoneNumber = async (event: any) => {
  const code = event?.detail?.code;
  if (!code) {
    uni.showToast({ title: '未获取到手机号授权', icon: 'none' });
    return;
  }
  const result: any = await api.bindPhone(code);
  form.contact_phone = result.phone;
  uni.showToast({ title: '手机号已填充', icon: 'none' });
};

const validate = () => {
  if (!form.contact_name) return '请填写联系人姓名';
  if (!/^1\d{10}$/.test(form.contact_phone)) return '请填写正确的联系电话';
  if (!form.province || !form.city || !form.district) return '请选择省市区';
  if (!form.detail) return '请填写详细地址';
  return '';
};

const submit = async () => {
  const error = validate();
  if (error) {
    uni.showToast({ title: error, icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    const payload = {
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      province: form.province,
      city: form.city,
      district: form.district,
      detail: form.detail,
      is_default: form.is_default,
    };
    const saved = form.id
      ? await api.updateAddress(form.id, payload)
      : await api.createAddress(payload);
    uni.$emit('address:updated', saved);
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 500);
  } finally {
    submitting.value = false;
  }
};

const goBack = () => uni.navigateBack();
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.address-edit {
  padding-bottom: 100px;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-body;
  margin-bottom: 12rpx;
}

.form-tip {
  font-size: 24rpx;
  color: $text-secondary;
}

.form-input,
.picker-input,
.textarea-input {
  width: 100%;
  box-sizing: border-box;
  background: $surface-page;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: $text-body;
  border: 1rpx solid $border-default;
}

.form-placeholder {
  color: $text-secondary;
}

.form-input {
  height: 88rpx;
  line-height: 40rpx;
}

.textarea-input {
  min-height: 180rpx;
  line-height: 1.6;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.phone-btn {
  margin: 0;
  padding: 0 20rpx;
  line-height: 56rpx;
  height: 56rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: $text-warning;
  background: $bg-primary-soft;
}

.default-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8rpx;
}

.default-check {
  font-size: 24rpx;
  color: $text-secondary;
}

.default-check.active {
  color: $text-warning;
  font-weight: 600;
}

.action-btn {
  width: 100%;
}

.static-bar {
  position: static;
  padding-top: 0;
  border-top: 0;
  background: transparent;
}
</style>

