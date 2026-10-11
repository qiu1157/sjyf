<template>
  <view class="login-page">
    <view class="logo-area">
      <view class="logo-icon">拾</view>
      <view class="logo-title">拾家有方</view>
      <view class="logo-sub">专业家政服务平台</view>
    </view>

    <!-- 微信小程序环境：授权登录 -->
    <!-- #ifdef MP-WEIXIN -->
    <view class="card">
      <button class="btn-wx" @click="onWxLogin">微信授权登录</button>
    </view>
    <!-- #endif -->

    <!-- H5 / 其他环境：手机号登录 -->
    <!-- #ifdef H5 || APP-PLUS -->
    <view class="card">
      <view class="card-title">手机号登录</view>
      <view class="form-item">
        <input
          class="input"
          type="number"
          maxlength="11"
          v-model="phone"
          placeholder="请输入手机号"
        />
      </view>
      <view class="form-item">
        <input
          class="input"
          type="text"
          v-model="nickname"
          placeholder="昵称（选填，留空自动生成）"
        />
      </view>
      <button class="btn-primary" :disabled="loading" @click="onPhoneLogin">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </view>
    <!-- #endif -->

    <!-- 开发模式：领队 Mock 登录（仅开发环境编译，生产构建时 isDev=false 卡片不渲染且被 tree-shake） -->
    <view v-if="isDev" class="dev-card">
      <view class="dev-title">开发模式</view>
      <view class="dev-desc">用 mock code 登录命中 seed 领队，验收 leaderEmployee 返回</view>
      <button class="btn-leader" :disabled="loading" @click="onLeaderMockLogin">
        {{ loading ? '登录中...' : '领队 Mock 登录' }}
      </button>
    </view>

    <view class="tip">开发环境，生产环境将使用微信授权登录</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { loginByPhone, loginByWx, loginAsLeaderMock, getLeaderEmployee } from '../../utils/auth';

// 开发环境标识：dev 构建为 true 显示 mock 入口，生产构建为 false 卡片不渲染
const isDev = process.env.NODE_ENV !== 'production';

const phone = ref('');
const nickname = ref('');
const loading = ref(false);

// 处理登录成功后的跳转：有 redirect 回原页，否则进 mine
const handleRedirect = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  // @ts-ignore uni-app 页面对象含 options
  const rawRedirect = currentPage?.options?.redirect || currentPage?.$page?.options?.redirect;
  const redirect = rawRedirect ? decodeURIComponent(rawRedirect) : '';
  if (redirect) {
    uni.redirectTo({ url: redirect });
  } else {
    uni.switchTab({ url: '/pages/mine/mine' });
  }
};

// 微信授权登录
const onWxLogin = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    await loginByWx();
    uni.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(handleRedirect, 500);
  } catch (e) {
    // request 已 toast 错误信息
  } finally {
    loading.value = false;
  }
};

// 开发模式领队 Mock 登录：用 mock code 命中 seed 领队，验收 leaderEmployee
const onLeaderMockLogin = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await loginAsLeaderMock();
    const leader = getLeaderEmployee();
    if (leader) {
      uni.showToast({ title: `领队登录成功：${leader.name}`, icon: 'none', duration: 2500 });
    } else {
      uni.showToast({ title: '登录成功但未识别为领队', icon: 'none' });
    }
    setTimeout(handleRedirect, 800);
  } catch (e) {
    // request 已 toast 错误信息
  } finally {
    loading.value = false;
  }
};

// 手机号登录
const onPhoneLogin = async () => {
  if (loading.value) return;
  if (!/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const user = await loginByPhone(phone.value, nickname.value || undefined);
    uni.showToast({ title: `欢迎，${user.nickname}`, icon: 'success' });
    setTimeout(handleRedirect, 500);
  } catch (e) {
    // request 已 toast 错误信息
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
@use '../../styles/variables.scss' as *;
.login-page {
  min-height: 100vh;
  background: $surface-page;
  padding: 60rpx 32rpx;
}
.logo-area {
  text-align: center;
  margin: 80rpx 0 60rpx;
}
.logo-icon {
  width: 120rpx;
  height: 120rpx;
  line-height: 120rpx;
  margin: 0 auto 24rpx;
  border-radius: 28rpx;
  background: $color-primary;
  color: $color-white;
  font-size: 56rpx;
  font-weight: 700;
}
.logo-title {
  font-size: 44rpx;
  font-weight: 700;
  color: $text-primary;
}
.logo-sub {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $text-secondary;
}
.card {
  background: $surface-card;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 32rpx;
}
.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 32rpx;
}
.form-item {
  margin-bottom: 24rpx;
}
.input {
  width: 100%;
  height: 88rpx;
  background: $neutral-50;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}
.btn-primary {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: $color-primary;
  color: $color-white;
  border-radius: 12rpx;
  font-size: 32rpx;
  margin-top: 16rpx;
  border: none;
}
.btn-primary[disabled] {
  opacity: 0.6;
}
.btn-wx {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: $color-primary;
  color: $color-white;
  border-radius: 12rpx;
  font-size: 32rpx;
  border: none;
}
.tip {
  text-align: center;
  font-size: 24rpx;
  color: $text-light;
  margin-top: 40rpx;
}
.dev-card {
  background: $surface-card;
  border: 2rpx dashed $color-warning-deep;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}
.dev-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $color-warning-deep;
  margin-bottom: 12rpx;
}
.dev-desc {
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 24rpx;
  line-height: 1.5;
}
.btn-leader {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: $surface-card;
  color: $color-primary;
  border: 2rpx solid $color-primary;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.btn-leader[disabled] {
  opacity: 0.6;
}
</style>

