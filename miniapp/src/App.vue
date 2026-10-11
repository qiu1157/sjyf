<script>
export default {
  onLaunch() {
    console.log('拾家有方小程序启动');
  },
};
</script>

<style lang="scss">
@use './styles/variables.scss' as *;
:root,
page {
  --token-banner-indicator: #{$overlay-white-50};
  --token-banner-indicator-active: #{$color-white};
  --token-category-indicator: #{$overlay-primary-soft};
  --token-category-indicator-active: #{$color-primary};
  background: $bg-grey;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}
.primary-color { color: $color-primary; }
.btn-primary {
  background: $color-primary; color: $color-white; padding: 24rpx; border-radius: 12rpx;
  text-align: center; font-size: 32rpx;
}
.card {
  background: $color-white; border-radius: 16rpx; padding: 24rpx; margin: 24rpx;
}
</style>

