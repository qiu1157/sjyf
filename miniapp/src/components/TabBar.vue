<template>
  <view class="tabbar">
    <view 
      class="tab-item" 
      :class="{ active: currentPath === item.path }"
      v-for="item in tabs" 
      :key="item.path"
      @click="switchTab(item.path)"
    >
      <text class="tab-icon">{{ item.icon }}</text>
      <text class="tab-text" :class="{ active: currentPath === item.path }">{{ item.name }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// 配置tab栏项
const tabs = [
  { name: '首页', path: '/pages/index/index', icon: '🏠' },
  { name: '分类', path: '/pages/category/category', icon: '📋' },
  { name: '订单', path: '/pages/order/order', icon: '📦' },
  { name: '我的', path: '/pages/mine/mine', icon: '👤' }
];

// 当前页面路径
const currentPath = ref('');

// 切换tab
const switchTab = (path: string) => {
  uni.switchTab({ url: path });
};

// 页面加载时获取当前路径
onMounted(() => {
  const pages = getCurrentPages();
  if (pages.length > 0) {
    currentPath.value = '/' + pages[pages.length - 1].route;
  }
});
</script>

<style lang="scss" scoped>
@use '../styles/variables.scss' as *;

.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 64px;
  background: $bg-paper-overlay;
  border-top: 1px solid $line-color;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  text-align: center;
  z-index: 999;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: $text-light;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    opacity: 0.8;
  }

  &.active {
    color: $text-dark;
  }
}

.tab-icon {
  font-size: 20px;
  line-height: 1;
}

.tab-text {
  font-size: 11px;
  font-weight: 500;
}
</style>

