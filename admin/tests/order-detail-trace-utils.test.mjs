import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdjustmentTraceRows,
  buildHistoryTimelineItems,
  groupPhotosBySpace,
} from '../src/pages/order-detail-trace-utils.mjs';

test('调整记录会生成可读的类型、内容和费用文案', () => {
  const result = buildAdjustmentTraceRows([
    {
      id: 1,
      adjust_type: 1,
      service_name: '窗帘深度清洁',
      adjust_amount: 88,
      operator_name: '领队张三',
      created_at: '2026-07-27 10:00:00',
      remark: '现场追加',
    },
    {
      id: 2,
      adjust_type: 3,
      material_name: '除胶剂',
      material_quantity: 2,
      adjust_amount: 30,
      operator_name: '领队张三',
      created_at: '2026-07-27 11:00:00',
    },
  ]);

  assert.deepEqual(result, [
    {
      id: 1,
      operator_name: '领队张三',
      created_at: '2026-07-27 10:00:00',
      adjust_type_text: '增项服务',
      content_text: '窗帘深度清洁',
      amount_text: '+¥88.00',
      remark: '现场追加',
    },
    {
      id: 2,
      operator_name: '领队张三',
      created_at: '2026-07-27 11:00:00',
      adjust_type_text: '增补物料',
      content_text: '除胶剂 x2',
      amount_text: '+¥30.00',
      remark: '',
    },
  ]);
});

test('订单历史参考用户侧事件并按时间正序排列', () => {
  const result = buildHistoryTimelineItems({
    order: {
      created_at: '2026-07-27 08:00:00',
      first_pay_time: '2026-07-27 08:05:00',
      first_payment: 199,
      cancel_apply_time: '2026-07-27 08:10:00',
      cancel_reason: '时间冲突',
      accept_time: '2026-07-27 09:00:00',
      sign_in_time: '2026-07-27 10:00:00',
      complete_time: '2026-07-27 11:00:00',
      final_pay_time: '2026-07-27 11:30:00',
      final_payment: 88,
      cancel_time: '2026-07-27 12:00:00',
    },
    histories: [
    {
      id: 11,
      history_type: 2,
      from_value: '2026-07-28 AM',
      to_value: '2026-07-29 PM',
      operator_name: '主管李四',
      created_at: '2026-07-27 08:30:00',
      remark: '用户临时有事',
    },
  ],
  });

  assert.deepEqual(result, [
    {
      id: 'created_at',
      title: '订单创建',
      operator_name: '系统',
      time: '2026-07-27 08:00:00',
      content_text: '订单已创建',
      remark: '',
    },
    {
      id: 'first_pay_time',
      title: '首款已付',
      operator_name: '用户',
      time: '2026-07-27 08:05:00',
      content_text: '支付 ¥199',
      remark: '',
    },
    {
      id: 'cancel_apply_time',
      title: '用户取消',
      operator_name: '用户',
      time: '2026-07-27 08:10:00',
      content_text: '已提交取消申请',
      remark: '时间冲突',
    },
    {
      id: 11,
      title: '改期记录',
      operator_name: '主管李四',
      time: '2026-07-27 08:30:00',
      content_text: '2026-07-28 AM -> 2026-07-29 PM',
      remark: '用户临时有事',
    },
    {
      id: 'accept_time',
      title: '主管接单',
      operator_name: '主管',
      time: '2026-07-27 09:00:00',
      content_text: '主管已接单分配',
      remark: '',
    },
    {
      id: 'sign_in_time',
      title: '服务中',
      operator_name: '领队',
      time: '2026-07-27 10:00:00',
      content_text: '领队已到达现场并开始服务',
      remark: '',
    },
    {
      id: 'complete_time',
      title: '服务完成',
      operator_name: '系统',
      time: '2026-07-27 11:00:00',
      content_text: '服务已完成',
      remark: '',
    },
    {
      id: 'final_pay_time',
      title: '尾款已付',
      operator_name: '用户',
      time: '2026-07-27 11:30:00',
      content_text: '支付 ¥88',
      remark: '',
    },
    {
      id: 'cancel_time',
      title: '订单取消',
      operator_name: '系统',
      time: '2026-07-27 12:00:00',
      content_text: '订单已取消',
      remark: '时间冲突',
    },
  ]);
});

test('现场照片会按空间和前后类型分组', () => {
  const result = groupPhotosBySpace([
    { id: 1, space_name: '客厅', photo_type: 1, photo_url: 'before-1.jpg' },
    { id: 2, space_name: '客厅', photo_type: 2, photo_url: 'after-1.jpg' },
    { id: 3, space_name: '厨房', photo_type: 1, photo_url: 'before-2.jpg' },
  ]);

  assert.deepEqual(result, [
    {
      space_name: '客厅',
      before: [{ id: 1, space_name: '客厅', photo_type: 1, photo_url: 'before-1.jpg' }],
      after: [{ id: 2, space_name: '客厅', photo_type: 2, photo_url: 'after-1.jpg' }],
    },
    {
      space_name: '厨房',
      before: [{ id: 3, space_name: '厨房', photo_type: 1, photo_url: 'before-2.jpg' }],
      after: [],
    },
  ]);
});

test('现场照片分组会忽略没有有效图片地址的数据', () => {
  const result = groupPhotosBySpace([
    { id: 1, space_name: '客厅', photo_type: 1, photo_url: 'before-1.jpg' },
    { id: 2, space_name: '客厅', photo_type: 2, photo_url: '   ' },
    { id: 3, space_name: '', photo_type: 2, url: 'after-2.jpg' },
  ]);

  assert.deepEqual(result, [
    {
      space_name: '客厅',
      before: [{ id: 1, space_name: '客厅', photo_type: 1, photo_url: 'before-1.jpg' }],
      after: [],
    },
    {
      space_name: '未分组空间',
      before: [],
      after: [{ id: 3, space_name: '', photo_type: 2, url: 'after-2.jpg' }],
    },
  ]);
});
