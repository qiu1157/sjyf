<template>
  <view class="address page-container">
    <view class="page-header">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">{{ pickMode ? '选择服务地址' : '地址管理' }}</view>
      <view></view>
    </view>

    <view v-if="addressList.length > 0" class="address-list">
      <view class="address-item card card-padding" v-for="item in addressList" :key="item.id">
        <view class="row address-main" @tap="handleSelect(item)">
          <view class="address-info">
            <view class="row mb-sm info-row">
              <text class="bold">{{ item.contact_name }}</text>
              <text class="mini muted ml-sm">{{ item.contact_phone }}</text>
            </view>
            <view class="address-text">{{ item.full_address }}</view>
          </view>
          <view class="badge badge-brown" v-if="item.is_default === 1">默认</view>
        </view>
        <view class="divider my-md"></view>
        <view class="row address-ops">
          <view class="address-actions">
            <button class="mini muted action-link plain-btn" hover-class="none" @tap.stop="setDefault(item)">
              {{ item.is_default === 1 ? '默认地址' : '设为默认' }}
            </button>
            <button class="mini muted ml-lg action-link plain-btn" hover-class="none" @tap.stop="editAddress(item.id)">编辑</button>
            <button class="mini danger ml-lg action-link plain-btn" hover-class="none" @tap.stop="removeAddress(item.id)">删除</button>
          </view>
          <text v-if="pickMode" class="mini muted">点击选择</text>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else>
      <text class="empty-icon">📍</text>
      <text class="empty-text">暂无服务地址</text>
      <text class="mini muted mt-sm">请先新增联系人与上门地址</text>
    </view>

    <view class="bottom-bar static-bar">
      <button class="btn action-btn" hover-class="none" @tap="addAddress">添加新地址</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { api } from '../../utils/request';

const addressList = ref<any[]>([]);
const pickMode = ref(false);

const load = async () => {
  addressList.value = await api.addresses();
};

onLoad((options: any) => {
  pickMode.value = options?.pick === '1';
  uni.$on('address:updated', load);
});

onShow(load);
onUnload(() => {
  uni.$off('address:updated', load);
});

const goBack = () => uni.navigateBack();

const addAddress = () => {
  uni.navigateTo({ url: '/pages/address/edit' });
};

const editAddress = (id: number) => {
  uni.navigateTo({ url: `/pages/address/edit?id=${id}` });
};

const setDefault = async (item: any) => {
  if (item.is_default === 1) return;
  await api.setDefaultAddress(item.id);
  uni.showToast({ title: '默认地址已更新', icon: 'none' });
  load();
};

const removeAddress = (id: number) => {
  uni.showModal({
    title: '删除地址',
    content: '删除后将无法继续用于下单，是否确认删除？',
    success: async (result) => {
      if (!result.confirm) return;
      await api.deleteAddress(id);
      uni.showToast({ title: '地址已删除', icon: 'none' });
      load();
    },
  });
};

const handleSelect = (item: any) => {
  if (!pickMode.value) return;
  uni.$emit('address:selected', item);
  uni.navigateBack();
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.address {
  padding-bottom: 100px;
}

// 地址列表
.address-list {
  padding: $spacing-base;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.address-item {
  transition: all 0.2s;

  &:active {
    transform: scale(0.99);
    opacity: 0.9;
  }
}

.address-main {
  width: 100%;
}

.address-info {
  flex: 1;
}

.info-row {
  justify-content: flex-start;
}

.address-text {
  font-size: $font-size-sm;
  color: $text-body;
  line-height: 1.5;
}

.address-actions {
  display: flex;
  align-items: center;
}

.ml-sm {
  margin-left: 8px;
}

.ml-lg {
  margin-left: 20px;
}

.danger {
  color: $state-error;
}

.action-link {
  padding: 0 8rpx;
  margin: 0;
  line-height: 1.4;
  background: transparent;
  border: 0;
}

.action-btn {
  width: 100%;
}

.plain-btn::after {
  border: 0;
}

.static-bar {
  position: static;
  padding-top: 0;
  border-top: 0;
  background: transparent;
}

// 空状态
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
    color: $text-secondary;
  }
}
</style>

