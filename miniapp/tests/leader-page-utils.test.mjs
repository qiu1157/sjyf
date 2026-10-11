import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEADER_PHOTO_SPACES,
  buildLeaderPhotoSpaces,
  getWorkbenchBackAction,
  getLeaderOrderBackAction,
  getLeaderPhotoBackAction,
} from '../src/pages/leader/page-utils.mjs';

test('领队拍照分组固定为 7 个业务区域且顺序正确', () => {
  assert.deepEqual(LEADER_PHOTO_SPACES, [
    '玄关',
    '客厅',
    '厨房',
    '主卧衣柜',
    '次卧/儿童房',
    '卫生间',
    '其他区域',
  ]);
});

test('领队工作台在有页面栈时优先返回上一页', () => {
  assert.deepEqual(getWorkbenchBackAction(2), {
    type: 'navigateBack',
    delta: 1,
  });
});

test('领队工作台在无页面栈时回到我的页面', () => {
  assert.deepEqual(getWorkbenchBackAction(1), {
    type: 'switchTab',
    url: '/pages/mine/mine',
  });
});

test('领队订单页在无页面栈时回到工作台', () => {
  assert.deepEqual(getLeaderOrderBackAction(1), {
    type: 'redirectTo',
    url: '/pages/leader/workbench',
  });
});

test('拍照页在无页面栈时回到对应订单详情', () => {
  assert.deepEqual(getLeaderPhotoBackAction(1, 128), {
    type: 'redirectTo',
    url: '/pages/leader/order?id=128',
  });
});

test('拍照页在固定分组后保留自定义空间和历史空间', () => {
  assert.deepEqual(
    buildLeaderPhotoSpaces(['书房'], [{ space_name: '阳台' }, { space_name: '客厅' }]),
    [
      '玄关',
      '客厅',
      '厨房',
      '主卧衣柜',
      '次卧/儿童房',
      '卫生间',
      '其他区域',
      '书房',
      '阳台',
    ],
  );
});
