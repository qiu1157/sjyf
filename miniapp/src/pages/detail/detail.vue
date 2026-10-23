<template>
  <view class="detail page-container">
    <!-- 顶部导航栏 -->
    <view class="page-header" style="position: sticky; top: 0; z-index: 100;">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">服务详情</view>
      <view class="header-btn">♡</view>
    </view>

    <!-- 下架/不存在提示页（US-028）-->
    <view v-if="isUnavailable" class="unavailable">
      <view class="unavailable-icon">📭</view>
      <view class="unavailable-text">该服务已下架/不存在</view>
      <view class="btn btn-brown btn-full unavailable-btn" @click="goBack">返回</view>
    </view>

    <!-- 服务详情内容 -->
    <template v-else-if="detail">
      <!-- Hero 区：封面图 + 服务名称 + 简介 -->
      <view class="hero-section">
        <image
          v-if="detail.cover_image"
          :src="detail.cover_image"
          class="hero-cover"
          mode="aspectFill"
        />
        <view class="hero-mask"></view>
        <view class="hero-info">
          <view class="hero-title">{{ detail.name }}</view>
          <view class="hero-desc" v-if="detail.description">{{ detail.description }}</view>
        </view>
      </view>

      <!-- 价格卡片：原价 + 促销价划线展示 + 服务时长 -->
      <view class="section mx-base">
        <view class="card card-padding">
          <view class="price-row">
            <text v-if="hasPromo" class="price-promo">¥{{ detail.promo_price }}</text>
            <text :class="['price', { 'price-origin': hasPromo }]">¥{{ detail.price }}</text>
          </view>
          <view class="price-meta mt-sm">
            <view class="mini muted">服务时长 {{ detail.duration }} 分钟</view>
            <!-- 服务方式标签（US-038）：仅当服务端返回有效枚举值时才展示 -->
            <view v-if="serviceModeLabel" class="mode-tag">{{ serviceModeLabel }}</view>
          </view>
        </view>
      </view>

      <!-- 详情说明：mp-html 渲染 content 快照（图片自适应 + 点击预览 + 懒加载） -->
      <view class="section mx-base">
        <view class="section-title mb-md">服务包含</view>
        <view class="card card-padding">
          <mp-html
            v-if="contentHtml"
            class="rich-content"
            :content="contentHtml"
            :preview-img="true"
            :lazy-load="true"
            selectable
          />
          <view v-else class="mini muted">暂无详细说明</view>
        </view>
      </view>

      <!-- 服务参数（US-038）：仅存量服务无派生数据时不展示，顺序与空值兜底均由服务端处理 -->
      <view v-if="params.length > 0" class="section mx-base">
        <view class="section-title mb-md">服务参数</view>
        <view class="card card-padding">
          <view class="param-table">
            <view
              v-for="(item, index) in params"
              :key="index"
              :class="['param-row', { 'param-row-last': index === params.length - 1 }]"
            >
              <view class="param-label">{{ item.label }}</view>
              <view class="param-value">{{ item.value }}</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 服务保障（US-040）：已配保障块 → 渲染该服务自己的保障项；未配置 → 回退存量硬编码三列 -->
      <view class="section mx-base">
        <view class="section-title mb-md">服务保障</view>
        <view v-if="guarantees.length > 0" class="guarantee-list">
          <view v-for="(item, index) in guarantees" :key="index" class="guarantee-item">
            <view :class="['guarantee-icon', `gi-${item.icon}`]"></view>
            <view class="guarantee-title">{{ item.title }}</view>
            <view v-if="item.desc" class="guarantee-desc">{{ item.desc }}</view>
          </view>
        </view>
        <!-- 历史回退：存量服务与未配保障的服务沿用原三列，展示与改造前一致 -->
        <view v-else class="grid-3">
          <view class="cat-item">
            <view class="cat-icon">👤</view>
            <text>实名人员</text>
          </view>
          <view class="cat-item">
            <view class="cat-icon">📋</view>
            <text>主管审核</text>
          </view>
          <view class="cat-item">
            <view class="cat-icon">✓</view>
            <text>验收确认</text>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <view class="btn btn-ghost" style="flex: 1;">咨询</view>
        <view class="btn" style="flex: 2;" @click="goBook">立即预约</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html';
import { api, request } from '../../utils/request';
import type { DetailSectionGuarantee } from '../../utils/request';

// 服务详情数据与页面状态
const serviceId = ref(0);
const detail = ref<any>(null);
// US-028：服务下架/删除时切换为提示页
const isUnavailable = ref(false);

// 是否有促销价：promo_price > 0 时展示划线原价 + 红色促销价
const hasPromo = computed(() => {
  return !!detail.value && Number(detail.value.promo_price) > 0;
});

/**
 * 详情 HTML（US-036）
 * 存量服务的 content 是纯文本（含 \n），HTML 规则会折叠换行，此处对「不含标签的纯文本」做轻量预处理；
 * 新内容为服务端生成的内联样式 HTML 快照，直接透传。
 */
const contentHtml = computed(() => {
  const raw = detail.value?.content;
  if (!raw) return '';
  return raw.includes('<') ? raw : raw.replace(/\n/g, '<br/>');
});

// 服务端派生的结构化渲染数据（US-038）；存量服务无此字段
const detailSections = computed(() => detail.value?.detail_sections ?? null);
// 服务参数表（顺序与文案由服务端派生，前端只渲染）
const params = computed(() => detailSections.value?.params ?? []);
// 服务保障项（US-040）：服务端派生；为空（未配保障块 / 存量服务）时回退硬编码三列
const guarantees = computed<DetailSectionGuarantee[]>(() => detailSections.value?.guarantees ?? []);
// 服务方式标签文案（US-038）：1 上门 / 2 到店 / 3 上门或到店
const serviceModeLabel = computed(() => {
  const map: Record<number, string> = { 1: '上门服务', 2: '到店服务', 3: '上门/到店均可' };
  const mode = Number(detail.value?.service_mode);
  return map[mode] || '';
});

// 页面加载：接收 id 参数并拉取服务详情
onLoad(async (options: any) => {
  const id = Number(options?.id);
  if (!id) {
    isUnavailable.value = true;
    return;
  }
  serviceId.value = id;
  await fetchDetail(id);
});

// 拉取服务详情，404 等异常归一为下架/不存在
const fetchDetail = async (id: number) => {
  try {
    detail.value = await api.serviceDetail(id);
  } catch (e) {
    // request.ts 内部已 showToast，这里仅切换到提示页
    isUnavailable.value = true;
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};

const buildConfirmUrl = () => `/pages/confirm/confirm?id=${serviceId.value}`;

const redirectToLogin = () => {
  uni.navigateTo({
    url: `/pages/login/login?redirect=${encodeURIComponent(buildConfirmUrl())}`,
  });
};

const ensureSession = async () => {
  const token = uni.getStorageSync('token');
  if (!token) return false;

  try {
    await request({ url: '/user/profile', silent401: true });
    return true;
  } catch (_) {
    return false;
  }
};

// 跳转预约页，携带服务 id；未登录时登录成功后直接回确认页
const goBook = async () => {
  if (!uni.getStorageSync('token')) {
    redirectToLogin();
    return;
  }

  const hasSession = await ensureSession();
  if (!hasSession) {
    redirectToLogin();
    return;
  }

  uni.navigateTo({ url: buildConfirmUrl() });
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;
@use '../../styles/icons.scss' as *;

.detail {
  padding-bottom: 100px;
}

.section {
  margin-top: $spacing-base;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

// 覆盖通用 hero 样式：封面图 + 文案叠加
.hero-section {
  margin: 0;
  height: 240px;
  border-radius: 0;
  background: $gradient-hero;
  padding: 0;
  position: relative;
  overflow: hidden;

  // 移除通用样式中的装饰圆点
  &::after {
    display: none;
  }
}

.hero-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

// 底部渐变遮罩，保证白色文案可读
.hero-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60%;
  background: linear-gradient(to top, $overlay-dark-70, transparent);
}

.hero-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: $spacing-lg;
  color: $neutral-0;
}

.hero-title {
  font-size: 24px;
  font-weight: $font-weight-black;
  line-height: 1.3;
}

.hero-desc {
  margin-top: 6px;
  font-size: $font-size-sm;
  color: $text-white-soft;
}

// 价格行：促销价红色 + 原价划线
.price-row {
  display: flex;
  align-items: baseline;
  gap: $spacing-sm;
}

.price-promo {
  color: $color-red;
  font-weight: $font-weight-black;
  font-size: $font-size-xl;
}

.price-origin {
  color: $text-light;
  font-size: $font-size-base;
  font-weight: $font-weight-normal;
  text-decoration: line-through;
}

.rich-content {
  font-size: $font-size-sm;
  line-height: 1.8;
  color: $text-body;
}

// 价格卡片辅助信息行：服务时长与「服务方式」胶囊标签并排
.price-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.mode-tag {
  padding: 2px 10px;
  background: $bg-tag-brown;
  color: $color-primary;
  border-radius: $radius-round;
  font-size: $font-size-xs;
}

// 服务参数表：左列标签固定比例浅底，右列取值自适应撑满
.param-table {
  border-radius: $radius-sm;
  overflow: hidden;
}

.param-row {
  display: flex;
  align-items: stretch;
  font-size: $font-size-sm;
  border-bottom: 1px solid $line-light;
}

// 末行去掉分隔线，避免与卡片底边重复
.param-row-last {
  border-bottom: none;
}

.param-label {
  width: 38%;
  padding: 8px 10px;
  background: $bg-paper-soft;
  color: $text-secondary;
}

.param-value {
  flex: 1;
  padding: 8px 10px;
  color: $text-primary;
  word-break: break-all;
}

// 服务保障区（US-040）：flex-wrap 排布（禁用 grid），窄屏自动折行
.guarantee-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.guarantee-item {
  flex: 0 0 calc((100% - #{$spacing-sm * 2}) / 3);
  box-sizing: border-box;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: $spacing-md $spacing-sm;
  border-radius: $radius-sm;
  background: $bg-primary-tint;
  text-align: center;
}

.guarantee-title {
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
  color: $text-primary-deep;
  word-break: break-word;
}

.guarantee-desc {
  font-size: 11px;
  line-height: 1.3;
  color: $text-secondary;
  word-break: break-word;
}

// 保障图标：lucide base64 SVG 经 mask 上色（禁止 emoji）；图标名与后端白名单一致
.guarantee-icon {
  @include sj-icon('badge-check', 40rpx, $color-primary-dark);
}

@each $name in ('shield-check', 'badge-check', 'clock', 'user-check', 'file-check', 'heart-handshake', 'wallet', 'award', 'sparkles', 'repeat') {
  .gi-#{$name} {
    @include sj-icon($name, 40rpx, $color-primary-dark);
  }
}

// 下架/不存在提示页
.unavailable {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px $spacing-xl 0;
}

.unavailable-icon {
  font-size: 64px;
  margin-bottom: $spacing-lg;
}

.unavailable-text {
  font-size: $font-size-lg;
  color: $text-secondary;
  margin-bottom: $spacing-xl;
}

.unavailable-btn {
  max-width: 200px;
}
</style>

