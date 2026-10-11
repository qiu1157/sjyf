<template>
  <view class="mine page-container">
    <!-- 顶部用户信息卡片：未登录展示"点击登录"，已登录展示昵称+手机号 -->
    <view class="mx-base mb-md mt-sm">
      <view class="user-card">
        <view class="row" @click="onUserCardTap">
          <view>
            <view class="user-name">{{ isLogged ? userInfo.nickname : '点击登录' }}</view>
            <view class="mini user-phone">{{ isLogged ? maskPhone(userInfo.phone) : '登录后享受更多服务' }}</view>
          </view>
          <view class="avatar" :class="{ 'avatar-default': !isLogged || !userInfo.avatar }">
            <image v-if="isLogged && userInfo.avatar" class="avatar-img" :src="userInfo.avatar" mode="aspectFill" />
            <text v-else class="avatar-text">{{ isLogged ? userInfo.nickname?.charAt(0) : '?' }}</text>
          </view>
        </view>
        <view class="member-tip mt-md">
          会员服务敬请期待
        </view>
      </view>
    </view>

    <!-- 领队工作台入口：仅当前用户为领队时展示（US-U02 完善跳转交互） -->
    <view v-if="isLogged && isLeaderUser" class="mx-base mb-md">
      <view class="leader-card" @click="goLeaderWorkbench">
        <view class="leader-left">
          <text class="leader-icon">🛠️</text>
          <view>
            <view class="leader-title">领队工作台</view>
            <view class="leader-sub">{{ leaderEmployee?.name }} · 查看我的服务订单</view>
          </view>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 订单快捷入口（需登录） -->
    <view class="section mx-base">
      <view class="grid-3">
        <view class="cat-item" @click="goOrderList()">
          <view class="cat-icon">📋</view>
          <text>待服务</text>
        </view>
        <view class="cat-item" @click="goOrderList()">
          <view class="cat-icon">✅</view>
          <text>待评价</text>
        </view>
        <view class="cat-item" @click="goOrderList()">
          <view class="cat-icon">💳</view>
          <text>退款</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单列表（需登录） -->
    <view class="menu-list">
      <view class="menu-item" @click="guard(goAddress)">
        <view class="menu-left">
          <text class="menu-icon">📍</text>
          <text class="menu-text">地址管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @click="guard(goCoupon)">
        <view class="menu-left">
          <text class="menu-icon">🎫</text>
          <text class="menu-text">我的优惠券</text>
        </view>
        <view class="menu-right">
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="menu-item" @click="guard(goMessage)">
        <view class="menu-left">
          <text class="menu-icon">🔔</text>
          <text class="menu-text">消息通知</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @click="contactService()">
        <view class="menu-left">
          <text class="menu-icon">💬</text>
          <text class="menu-text">联系客服</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <!-- 退出登录（仅已登录显示） -->
      <view class="menu-item" v-if="isLogged" @click="onLogout">
        <view class="menu-left">
          <text class="menu-icon">🚪</text>
          <text class="menu-text">退出登录</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { isLogin, getUserInfo, refreshProfile, logout, getLeaderEmployee, isLeader } from '../../utils/auth';

// 登录态：本地 token 是否存在
const isLogged = ref(false);
// 用户信息（昵称、手机号、头像）
const userInfo = ref<any>({});
// 领队标识：{id,name} 或 null；isLeaderUser 控制领队入口展示
const leaderEmployee = ref<{ id: number; name: string } | null>(null);
const isLeaderUser = ref(false);

// 页面显示时恢复/刷新登录态
onShow(async () => {
  isLogged.value = isLogin();
  if (isLogged.value) {
    // 先用本地缓存快速渲染，再异步刷新最新信息
    userInfo.value = getUserInfo() || {};
    leaderEmployee.value = getLeaderEmployee();
    isLeaderUser.value = isLeader();
    const fresh = await refreshProfile();
    if (fresh) {
      userInfo.value = fresh;
      leaderEmployee.value = getLeaderEmployee();
      isLeaderUser.value = isLeader();
    }
  } else {
    userInfo.value = {};
    leaderEmployee.value = null;
    isLeaderUser.value = false;
  }
});

// 手机号脱敏：139****5678
const maskPhone = (phone: string) => {
  if (!phone || phone.length < 11) return phone || '';
  return phone.slice(0, 3) + '****' + phone.slice(7);
};

// 未登录守卫：点击需登录功能时引导跳登录页
const guard = (fn: () => void) => {
  if (!isLogged.value) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    setTimeout(() => uni.navigateTo({ url: '/pages/login/login' }), 600);
    return;
  }
  fn();
};

// 点击用户卡片：未登录跳登录，已登录不做操作（后续可扩展个人资料页）
const onUserCardTap = () => {
  if (!isLogged.value) uni.navigateTo({ url: '/pages/login/login' });
};

// 退出登录
const onLogout = async () => {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        await logout();
        isLogged.value = false;
        userInfo.value = {};
        leaderEmployee.value = null;
        isLeaderUser.value = false;
        uni.showToast({ title: '已退出登录', icon: 'success' });
      }
    },
  });
};

// 跳转到订单列表
const goOrderList = () => {
  guard(() => uni.switchTab({ url: '/pages/order/order' }));
};

// 地址管理
const goAddress = () => {
  uni.navigateTo({ url: '/pages/address/address' });
};

// 优惠券
const goCoupon = () => {
  uni.navigateTo({ url: '/pages/coupon/coupon' });
};

// 消息通知
const goMessage = () => {
  uni.showToast({ title: '暂无新消息', icon: 'none' });
};

// 联系客服
const contactService = () => {
  uni.showToast({ title: '客服热线：400-XXX-XXXX', icon: 'none', duration: 3000 });
};

// 跳转领队工作台（US-U02 完善交互，本期先跳转占位）
const goLeaderWorkbench = () => {
  uni.navigateTo({ url: '/pages/leader/workbench' });
};
</script>

<style lang="scss" scoped>
@use 'sass:color';
@use '../../styles/common.scss' as *;

.mine {
  padding-bottom: 80px;
}

// 用户信息卡片
.user-card {
  background: $gradient-btn;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  color: $color-white;

  .user-name {
    font-size: 22px;
    font-weight: $font-weight-black;
    line-height: 1.2;
  }

  .user-phone {
    color: $text-white-soft;
    margin-top: 6px;
  }

  .member-tip {
    background: $overlay-white-soft;
    padding: $spacing-sm $spacing-base;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    text-align: center;
  }
}

// 头像
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-default {
  background: $overlay-white-soft;
}
.avatar-img {
  width: 100%;
  height: 100%;
}
.avatar-text {
  color: $color-white;
  font-size: 28px;
  font-weight: 600;
}

// 菜单列表
.menu-list {
  margin: $spacing-lg $spacing-base 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.menu-item {
  background: $bg-paper;
  border-radius: $radius-md;
  padding: $spacing-base $spacing-lg;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid $line-light;
  transition: all 0.2s;

  &:active {
    background: color.adjust($bg-cream, $lightness: 2%);
    transform: scale(0.99);
  }
}

.menu-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.menu-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.menu-text {
  font-size: $font-size-base;
  color: $text-dark;
  font-weight: 500;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.menu-arrow {
  font-size: 20px;
  color: $text-light;
  font-weight: 500;
}

// 领队工作台入口卡片
.leader-card {
  background: linear-gradient(135deg, $color-primary, $color-warning-deep);
  border-radius: $radius-lg;
  padding: $spacing-lg;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: $color-white;
  box-shadow: $shadow-card;

  &:active {
    transform: scale(0.99);
    opacity: 0.95;
  }

  .leader-left {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  .leader-icon {
    font-size: 28px;
  }

  .leader-title {
    font-size: 18px;
    font-weight: $font-weight-bold;
  }

  .leader-sub {
    font-size: $font-size-sm;
    margin-top: 4px;
    opacity: 0.9;
  }

  .menu-arrow {
    color: $color-white;
    font-size: 22px;
  }
}
</style>

