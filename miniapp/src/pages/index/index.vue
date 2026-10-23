<template>
  <view class="home">
    <!-- 第一层：走马灯海报 -->
    <view class="banner-wrap" v-if="bannerSlides.length > 0">
      <swiper
        class="banner-swiper"
        :indicator-dots="false"
        :autoplay="autoPlaying"
        :interval="5000"
        :duration="500"
        :circular="true"
        @change="onBannerChange"
        @touchstart="onBannerTouchStart"
        @touchend="onBannerTouchEnd"
      >
        <swiper-item v-for="item in bannerSlides" :key="item.id" @click="goDetail(item)">
          <view class="banner-item">
            <image
              class="banner-image"
              :src="resolveImg(item.banner_image || item.cover_image)"
              mode="aspectFill"
            />
          </view>
        </swiper-item>
      </swiper>
      <!-- 原生指示点在小程序/H5 双端表现不一致，故自绘；外层 pointer-events 置空以免挡住海报点击 -->
      <view class="banner-indicator">
        <view
          v-for="(item, idx) in bannerSlides"
          :key="item.id"
          class="banner-indicator-item"
          :class="{ 'banner-indicator-item-active': idx === activeBannerIndex }"
        ></view>
      </view>
    </view>

    <!-- 走马灯骨架：尺寸与真实走马灯完全一致，避免加载完成时的布局跳动 -->
    <view class="banner-skeleton" v-else-if="loading"></view>

    <!-- 第二层：服务品类宫格 -->
    <view class="section" v-if="categories.length > 0">
      <view class="section-header">
        <text class="section-title">服务分类</text>
        <text class="section-more" @click="goCategory">全部 ›</text>
      </view>
      <swiper
        class="cat-swiper"
        :indicator-dots="categoryPages.length > 1"
        indicator-color="var(--token-category-indicator)"
        indicator-active-color="var(--token-category-indicator-active)"
        :autoplay="false"
        :circular="false"
        :duration="300"
      >
        <swiper-item v-for="(page, pageIdx) in categoryPages" :key="pageIdx">
          <view class="cat-grid">
            <view
              class="cat-item"
              v-for="item in page"
              :key="item.id"
              @click="selectCategory(item)"
            >
              <image
                v-if="resolveImg(item.icon)"
                class="cat-icon"
                :src="resolveImg(item.icon)"
                mode="aspectFit"
              />
              <view v-else class="cat-icon cat-icon-placeholder">
                <text class="cat-icon-text">{{ placeholderChar(item.name) }}</text>
              </view>
              <text class="cat-name">{{ item.name }}</text>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <view class="section" v-else-if="loading">
      <!-- 骨架：品类楼层位于「最新活动」之上，若不占位，其数据到达时会把下方楼层整体下推 -->
      <view class="section-header">
        <text class="section-title">服务分类</text>
      </view>
      <view class="cat-swiper">
        <view class="cat-grid">
          <view class="cat-item" v-for="n in 8" :key="n">
            <view class="cat-icon cat-icon-skeleton"></view>
            <view class="cat-name-skeleton"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 第三层：最新活动专区（横向滑动大卡，机制上杜绝自动播放） -->
    <view class="activity-section" v-if="latestCards.length > 0">
      <view class="section-header activity-header">
        <view class="section-title-wrap">
          <view class="section-icon"></view>
          <text class="section-title">最新活动</text>
        </view>
        <text class="section-more" @click="goCategory">全部 ›</text>
      </view>
      <!-- scroll-view 横向滚动：不用 swiper，从机制上不可能自动滚动 -->
      <scroll-view class="activity-scroll" scroll-x="true" :show-scrollbar="false">
        <view class="activity-track">
          <view
            class="activity-card"
            v-for="card in latestCards"
            :key="card.item.id"
            @click="goDetail(card.item)"
          >
            <view class="activity-badge" v-if="card.hasPromo">限时特惠</view>
            <text class="activity-name">{{ card.item.name }}</text>
            <text class="activity-sub" v-if="card.subText">{{ card.subText }}</text>
            <view class="activity-watermark"></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="activity-section" v-else-if="loading">
      <!-- 骨架：标题保留、卡片尺寸/间距与真实卡片一致，数据到达后不产生位移 -->
      <view class="section-header activity-header">
        <view class="section-title-wrap">
          <view class="section-icon"></view>
          <text class="section-title">最新活动</text>
        </view>
      </view>
      <view class="activity-scroll" scroll-x="true" :show-scrollbar="false">
        <view class="activity-track">
          <view class="activity-skeleton" v-for="n in 2" :key="n"></view>
        </view>
      </view>
    </view>

    <!-- 第四层：精选服务（2 列网格，与「最新活动」的横滑大卡形成形态区分） -->
    <view class="section section-last" v-if="hotCards.length > 0">
      <view class="section-header">
        <view class="section-title-wrap">
          <view class="section-icon-hot"></view>
          <text class="section-title">精选服务</text>
        </view>
        <text class="section-more" @click="goCategory">更多 ›</text>
      </view>
      <view class="hot-grid">
        <view
          class="hot-card"
          v-for="card in hotCards"
          :key="card.item.id"
          @click="goDetail(card.item)"
        >
          <view class="hot-thumb-box">
            <image
              v-if="resolveImg(card.thumb)"
              class="hot-thumb"
              :src="resolveImg(card.thumb)"
              mode="aspectFill"
              lazy-load="true"
            />
            <view v-else class="hot-thumb hot-thumb-placeholder">
              <text class="hot-thumb-text">{{ placeholderChar(card.item.name) }}</text>
            </view>
            <!-- 角标由真实促销价派生：每卡最多 1 个且必须带文字 -->
            <view class="hot-badge" v-if="card.hasPromo">限时特惠</view>
          </view>
          <view class="hot-body">
            <text class="hot-name">{{ card.item.name }}</text>
            <text class="hot-attr" v-if="card.attrText">{{ card.attrText }}</text>
            <view class="hot-price">
              <template v-if="card.hasPromo">
                <text class="hot-price-promo">¥{{ formatPrice(card.item.promo_price) }}</text>
                <text class="hot-price-original">¥{{ formatPrice(card.item.price) }}</text>
              </template>
              <text v-else class="hot-price-current">¥{{ formatPrice(card.item.price) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section section-last" v-else-if="loading">
      <!-- 骨架：2×2，内部行高与真实卡片一致（图占位 + 2 行标题 + 属性行 + 价格行），数据到达后楼层高度基本不变 -->
      <view class="section-header">
        <view class="section-title-wrap">
          <view class="section-icon-hot"></view>
          <text class="section-title">精选服务</text>
        </view>
      </view>
      <view class="hot-grid">
        <view class="hot-card hot-card-skeleton" v-for="n in 4" :key="n">
          <view class="hot-thumb-skeleton"></view>
          <view class="hot-body">
            <view class="skeleton-line"></view>
            <view class="skeleton-line skeleton-line-short"></view>
            <view class="skeleton-attr"></view>
            <view class="skeleton-price"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态：所有数据都为空 -->
    <view class="home-empty" v-if="!loading && bannerList.length === 0 && categories.length === 0 && latestList.length === 0 && hotList.length === 0">
      <!-- 线性图标（lucide inbox），不使用 emoji -->
      <view class="empty-icon"></view>
      <text class="empty-text">暂无服务数据</text>
    </view>

    <!-- 底部安全区占位 -->
    <view class="bottom-placeholder"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { onPullDownRefresh } from '@dcloudio/uni-app';
import { resolveAssetUrl } from '../../utils/config';
import { api } from '../../utils/request';

const bannerList = ref<any[]>([]);
const categories = ref<any[]>([]);
const latestList = ref<any[]>([]);
const hotList = ref<any[]>([]);
const loading = ref(false);

// 走马灯楼层上限 5 张，超出部分运营打标也不展示
const bannerSlides = computed(() => bannerList.value.slice(0, 5));
const bannerCurrent = ref(0);
// circular 循环时 current 会回绕，取模避免高亮落到不存在的下标
const activeBannerIndex = computed(() => {
  return bannerSlides.value.length ? bannerCurrent.value % bannerSlides.value.length : 0;
});

const onBannerChange = (e: any) => {
  bannerCurrent.value = e?.detail?.current ?? 0;
};

// H5 端尊重系统「减少动态效果」偏好；微信端不受影响
const detectReducedMotion = () => {
  // #ifdef H5
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  // #endif
  return false;
};

const reducedMotion = detectReducedMotion();
const autoPlaying = ref(!reducedMotion);
let resumeTimer: ReturnType<typeof setTimeout> | null = null;

const clearResumeTimer = () => {
  if (resumeTimer !== null) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }
};

// 按住海报即暂停：用户想停下来细看时不再被自动切换打断
const onBannerTouchStart = () => {
  clearResumeTimer();
  autoPlaying.value = false;
};

// 松手延时恢复；重复触发先清掉上一个定时器，避免「松手后又被旧定时器提前恢复」
const onBannerTouchEnd = () => {
  clearResumeTimer();
  resumeTimer = setTimeout(() => {
    autoPlaying.value = !reducedMotion;
    resumeTimer = null;
  }, 2000);
};

onUnmounted(clearResumeTimer);

const categoryPages = computed(() => {
  const pages: any[][] = [];
  const size = 8;
  for (let i = 0; i < categories.value.length; i += size) {
    pages.push(categories.value.slice(i, i + size));
  }
  return pages;
});

const resolveImg = (url: string) => {
  if (!url) return '';
  return resolveAssetUrl(url);
};

const placeholderChar = (name: string) => {
  return name ? name.charAt(0) : '?';
};

// 价格格式化：整数不带小数（与分类页口径保持一致，US-047 验收场景 9）
const formatPrice = (val: any) => {
  const n = Number(val || 0);
  if (isNaN(n)) return '0';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
};

// 省额展示：最多保留 2 位小数并去掉多余的 0（如 50 -> "50"，33.20 -> "33.2"）
const formatAmount = (val: number) => {
  return String(Math.round(val * 100) / 100);
};

// 副文案由真实价差派生（合规要求，禁止无依据的「立减 X」）：见 spec §15.3 四档规则
const buildPromoText = (item: any): string => {
  const price = Number(item.price) || 0;
  const promo = Number(item.promo_price) || 0;
  if (promo > 0 && price > 0) {
    const saved = price - promo;
    // Rule of 100：省额 ≥¥100 用绝对金额更直观，<¥100 用百分比避免「立减 ¥0.5」式低感知
    return saved >= 100
      ? `省 ¥${formatAmount(saved)}`
      : `立减 ${Math.round((saved / price) * 100)}%`;
  }
  // 无促销价时退回服务简介首行；简介也为空则返回空串，模板据此不渲染该行
  return String(item.description || '').trim();
};

// 活动卡最多 5 张（后端已限 5 条，前端 slice 为冗余兜底，双重防线）
// 预计算副文案，避免模板里对同一项重复计算（性能优化）
const latestCards = computed(() =>
  latestList.value.slice(0, 5).map((item) => ({
    item,
    hasPromo: Number(item.promo_price) > 0,
    subText: buildPromoText(item),
  })),
);

// 服务方式短文案（首页卡片从简，与详情页的完整文案刻意区分）：1 上门 / 2 到店 / 3 上门或到店
const SERVICE_MODE_TEXT: Record<number, string> = { 1: '上门', 2: '到店', 3: '上门或到店' };

// 服务属性行：时长与方式只显示已填部分；两项都未填时返回空串，模板据此不渲染该行（不留空行）
const buildAttrText = (item: any): string => {
  const parts: string[] = [];
  const duration = Number(item.duration);
  if (duration > 0) parts.push(`${duration}分钟`);
  const modeText = SERVICE_MODE_TEXT[Number(item.service_mode)];
  if (modeText) parts.push(modeText);
  return parts.join(' · ');
};

// 精选服务 2×2：最多 4 张（后端已限 4 条，前端 slice 为冗余兜底）
// 预计算缩略图与属性行，避免模板内对同一项重复计算（性能优化）
const hotCards = computed(() =>
  hotList.value.slice(0, 4).map((item) => ({
    item,
    hasPromo: Number(item.promo_price) > 0,
    thumb: item.thumbnail_image || item.cover_image,
    attrText: buildAttrText(item),
  })),
);

const loadData = async () => {
  loading.value = true;
  try {
    const [b, c, l, h] = await Promise.all([
      api.banner(),
      api.categories(),
      api.latest(),
      api.hot(),
    ]);
    bannerList.value = b || [];
    categories.value = c || [];
    latestList.value = l || [];
    hotList.value = h || [];
  } catch (e) {
    // request 拦截器已 showToast
  } finally {
    loading.value = false;
  }
};

onPullDownRefresh(async () => {
  await loadData();
  uni.stopPullDownRefresh();
});

loadData();

const goCategory = () => {
  uni.switchTab({ url: '/pages/category/category' });
};

const selectCategory = (item: any) => {
  uni.setStorageSync('categoryFilter', {
    categoryId: item.id,
    categoryName: item.name,
  });
  uni.switchTab({ url: '/pages/category/category' });
};

const goDetail = (item: any) => {
  uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}` });
};
</script>

<style lang="scss" scoped>
@use '../../styles/variables.scss' as *;
@use '../../styles/icons.scss' as *;
.home {
  min-height: 100vh;
  background: $surface-page;
}

// 走马灯
// 外层仅提供绝对定位参照，尺寸与留白交给 swiper 本身
.banner-wrap {
  position: relative;
}

.banner-swiper,
.banner-skeleton {
  // 左右 32rpx 与下方 .section 的 40rpx 32rpx 栅格左边缘对齐；顶部 24rpx 保持页面节奏
  margin: 24rpx 32rpx 0;
  height: 320rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.banner-skeleton {
  background: $neutral-100;
}

// 自绘指示器：底部居中，深色半透明底保证指示条对比度（WCAG 1.4.11 AA）
.banner-indicator {
  position: absolute;
  left: 50%;
  bottom: 24rpx;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(32, 26, 19, 0.55);
  // 不拦截触摸，海报仍可整块点击进详情
  pointer-events: none;
}

.banner-indicator-item {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
}

.banner-indicator-item-active {
  width: 32rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: $neutral-0;
}

.banner-item {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
}

// 通用区块
.section {
  margin: 40rpx 32rpx 0;
}

.section-last {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: 600;
  color: $text-primary;
}

.section-more {
  font-size: 26rpx;
  color: $text-secondary;
}

// 带图标的区块标题（lucide 图标 + 文案）
.section-title-wrap {
  display: flex;
  align-items: center;
}

.section-icon {
  @include sj-icon('badge-percent', 32rpx, $color-primary);
  margin-right: 10rpx;
}

// 精选服务标题图标（火焰，主色）
.section-icon-hot {
  @include sj-icon('flame', 32rpx, $color-primary);
  margin-right: 10rpx;
}

// 最新活动：横滑大卡
// 该板块不用 .section 左右留白，改为「标题留白 + 满宽滚动容器内边距」，
// 让卡片能横向滚到页面边缘消失，而左侧仍与其它 .section 的 32rpx 栅格对齐
.activity-section {
  margin-top: 40rpx;
}

.activity-header {
  // 覆盖 .section-header 默认的 margin-bottom，补齐左右 32rpx 栅格
  margin: 0 32rpx 24rpx;
}

.activity-scroll {
  width: 100%;
  // 内边距实现左右留白，卡片可滚到边缘；满宽让下一张露出更多
  padding: 0 32rpx;
  box-sizing: border-box;
  white-space: nowrap;
}

// H5 隐藏横向滚动条（原型 no-scrollbar）；微信端由 :show-scrollbar="false" 控制
.activity-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.activity-track {
  // 行内弹性轨道：宽度由内容撑开，从而在满宽容器内产生横向溢出
  display: inline-flex;
  align-items: stretch;
}

.activity-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 440rpx;
  height: 192rpx;
  box-sizing: border-box;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  // 底色由现有令牌派生（白 → 浅沙），不新增色值
  background: $gradient-card;
  overflow: hidden;
  margin-right: 20rpx;
}

.activity-badge {
  align-self: flex-start;
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1.4;
  font-weight: 700;
  // 主色实底 + 白字，保证角标在浅色渐变上有足够对比
  background: $color-primary;
  color: $neutral-0;
}

.activity-name {
  margin-top: 10rpx;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.3;
  color: $text-primary;
  // 服务名最多 2 行
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.activity-sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.3;
  color: $text-secondary;
  // 单行截断
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 水印：固定 lucide sparkles，25% 透明度，纯装饰、不承载语义
.activity-watermark {
  position: absolute;
  right: -8rpx;
  bottom: -8rpx;
  opacity: 0.25;
  @include sj-icon('sparkles', 112rpx, $color-primary);
}

// 最新活动骨架块：尺寸与间距与真实卡片完全一致，仅为骨架色
.activity-skeleton {
  width: 440rpx;
  height: 192rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  margin-right: 20rpx;
  background: $neutral-100;
}

// 品类宫格 swiper 分页（每页8个，4列×2行）
.cat-swiper {
  width: 100%;
  height: 380rpx;
}

.cat-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 8rpx;
}

.cat-item {
  width: 25%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 8rpx;
}

.cat-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: $bg-grey;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.cat-icon-placeholder {
  background: $gradient-card;
}

.cat-icon-text {
  font-size: 36rpx;
  color: $color-primary;
  font-weight: 600;
}

.cat-name {
  font-size: 24rpx;
  color: $text-primary;
  text-align: center;
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 品类宫格骨架：与真实图标的尺寸/位置一致，仅换为骨架色
.cat-icon-skeleton {
  background: $neutral-100;
}

.cat-name-skeleton {
  width: 72rpx;
  height: 24rpx;
  border-radius: 6rpx;
  background: $neutral-100;
}

// 精选服务：2 列网格
// 用 flex-wrap 而非 display:grid —— grid 在微信小程序端兼容性不稳，flex 双端一致
.hot-grid {
  display: flex;
  flex-wrap: wrap;
  // 两端对齐：每行 2 张，中间自动留出 24rpx 间距，且左右与 .section 的 32rpx 栅格对齐
  justify-content: space-between;
}

.hot-card {
  // 两张卡各占半宽再各减去半个间距（12rpx），两卡 + 间距 = 满宽
  width: calc(50% - 12rpx);
  box-sizing: border-box;
  margin-bottom: 24rpx;
  background: $bg-paper;
  border-radius: 20rpx;
  // 裁掉缩略图四角，使图片上边缘随卡片圆角
  overflow: hidden;
  box-shadow: $shadow-light;
}

.hot-thumb-box {
  position: relative;
}

.hot-thumb {
  display: block;
  width: 100%;
  height: 224rpx;
}

.hot-thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $gradient-card;
}

.hot-thumb-text {
  font-size: 56rpx;
  font-weight: 600;
  color: $color-primary;
}

// 角标：warning 橙实底 + 白字。取 $color-warning-strong(#D96B16) 而非 $state-warning(#D99A3D)——
// 后者与白字对比仅 2.43:1，不满足 WCAG 非文本对比 ≥3:1；前者为 3.46:1
.hot-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1.4;
  font-weight: 700;
  background: $color-warning-strong;
  color: $neutral-0;
}

.hot-body {
  padding: 16rpx 20rpx 20rpx;
}

.hot-name {
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.35;
  color: $text-primary;
  // 服务名最多 2 行，保证同排卡片高度一致
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

// 服务属性行（家政关键决策信息）：240分钟 · 上门
.hot-attr {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.3;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-price {
  display: flex;
  align-items: baseline;
  margin-top: 12rpx;
}

.hot-price-promo {
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1;
  color: $color-primary;
  margin-right: 10rpx;
}

.hot-price-original {
  font-size: 22rpx;
  line-height: 1;
  color: $text-light;
  text-decoration: line-through;
}

.hot-price-current {
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1;
  color: $color-primary;
}

// 精选服务骨架：外壳复用 .hot-card（白底 + 轻阴影），仅内部占位块为骨架色，
// 从而数据到达时卡片外框尺寸不变，避免整层跳动
.hot-card-skeleton {
  // 骨架不可点击，避免空白期误触进详情
  pointer-events: none;
}

.hot-thumb-skeleton {
  height: 224rpx;
  background: $neutral-100;
}

// 骨架行高对齐真实卡片内部各行（标题 2 行 / 属性行 / 价格行），
// 使数据到达时楼层高度变化控制在数像素内（验收场景 2）
.skeleton-line {
  height: 38rpx;
  border-radius: 8rpx;
  background: $neutral-100;
}

.skeleton-line-short {
  width: 55%;
}

.skeleton-attr {
  height: 28rpx;
  margin-top: 8rpx;
  border-radius: 8rpx;
  background: $neutral-100;
}

.skeleton-price {
  width: 40%;
  height: 36rpx;
  margin-top: 12rpx;
  border-radius: 8rpx;
  background: $neutral-100;
}

// 空状态
.home-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

// 空态图标：lucide inbox 线性图标（禁止 emoji）
.empty-icon {
  @include sj-icon('inbox', 120rpx, $text-light);
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-light;
}

// 底部占位
.bottom-placeholder {
  height: 80rpx;
}
</style>

