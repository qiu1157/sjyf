<template>
  <view class="page">
    <view class="page-header">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">现场照片</view>
      <view class="header-btn" @click="addSpace">+</view>
    </view>

    <view class="space-card" v-for="space in spaceGroups" :key="space">
      <view class="space-title">{{ space }}</view>
      <view class="photo-block">
        <view class="block-title">服务前</view>
        <view class="photos">
          <view class="photo-item" v-for="photo in getSpacePhotos(space, 1)" :key="photo.id">
            <image :src="photo.photo_url" mode="aspectFill" class="photo" />
            <view class="delete-btn" @click="removePhoto(photo.id)">删除</view>
          </view>
          <view class="add" @click="chooseUploadSource(space, 1)">+</view>
        </view>
      </view>

      <view class="photo-block">
        <view class="block-title">服务后</view>
        <view class="photos">
          <view class="photo-item" v-for="photo in getSpacePhotos(space, 2)" :key="photo.id">
            <image :src="photo.photo_url" mode="aspectFill" class="photo" />
            <view class="delete-btn" @click="removePhoto(photo.id)">删除</view>
          </view>
          <view class="add" @click="chooseUploadSource(space, 2)">+</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api } from '../../utils/request';
import {
  buildLeaderPhotoSpaces,
  getLeaderPhotoBackAction,
  runBackAction,
} from './page-utils.mjs';

const id = ref(0);
const photos = ref<any[]>([]);
const customSpaces = ref<string[]>([]);
const spaceGroups = computed(() => buildLeaderPhotoSpaces(customSpaces.value, photos.value));

onLoad((opts: any) => { id.value = +opts.id; });
onShow(async () => { await loadPhotos(); });

const loadPhotos = async () => {
  photos.value = (await api.leaderPhotos(id.value)) as any[];
};

const getSpacePhotos = (spaceName: string, type: number) => (
  photos.value.filter((item) => String(item.space_name || '').trim() === spaceName && item.photo_type === type)
);

const addSpace = () => {
  uni.showModal({
    title: '新增空间',
    editable: true,
    placeholderText: '请输入空间名称，如书房',
    success: (res) => {
      const name = String(res.content || '').trim();
      if (!res.confirm || !name) return;
      if (!spaceGroups.value.includes(name)) {
        customSpaces.value.push(name);
      }
    },
  });
};

const chooseUploadSource = (spaceName: string, type: number) => {
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择'],
    success: (res) => {
      const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
      uploadPhotos(spaceName, type, sourceType as ('camera' | 'album')[]);
    },
  });
};

const uploadPhotos = async (spaceName: string, type: number, sourceType: ('camera' | 'album')[]) => {
  uni.chooseImage({
    count: 9,
    sourceType,
    success: async (res) => {
      const uploadedPhotos = [];
      for (const filePath of res.tempFilePaths) {
        const uploadResult: any = await api.uploadLeaderPhoto(filePath);
        uploadedPhotos.push({
          photo_type: type,
          space_name: spaceName,
          photo_url: uploadResult.url,
        });
      }
      await api.uploadPhotos(id.value, uploadedPhotos);
      uni.showToast({ title: '上传成功' });
      await loadPhotos();
    },
  });
};

const removePhoto = async (photoId: number) => {
  await api.deletePhoto(id.value, photoId);
  uni.showToast({ title: '已删除' });
  await loadPhotos();
};

const goBack = () => {
  const stackSize = typeof getCurrentPages === 'function' ? getCurrentPages().length : 1;
  runBackAction(getLeaderPhotoBackAction(stackSize, id.value));
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.page {
  min-height: 100vh;
  background: $bg-cream;
  padding-bottom: 24rpx;
}

.space-card {
  background: $bg-paper;
  border-radius: 20rpx;
  margin: 20rpx 24rpx;
  padding: 24rpx;
  box-shadow: $shadow-card;
}

.space-title {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-dark;
  margin-bottom: 16rpx;
}

.photo-block + .photo-block {
  margin-top: 20rpx;
}

.block-title {
  font-size: 26rpx;
  color: $text-body;
  margin-bottom: 12rpx;
}

.photos {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-item {
  position: relative;
}

.photo {
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  background: $bg-grey;
}

.delete-btn {
  position: absolute;
  right: 8rpx;
  bottom: 8rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  background: $overlay-dark-70;
  color: $color-white;
}

.add {
  width: 180rpx;
  height: 180rpx;
  border: 2rpx dashed $line-color;
  border-radius: 12rpx;
  text-align: center;
  line-height: 180rpx;
  font-size: 60rpx;
  color: $text-light;
  background: $bg-grey;
}
</style>

