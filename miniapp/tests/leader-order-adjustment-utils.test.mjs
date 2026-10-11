import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVisiblePlannedMaterials,
  buildServiceAdjustmentPayload,
  buildServiceSuggestionList,
  canEditAdjustmentActions,
  buildAdjustmentEditDraft,
  syncSelectedServiceId,
} from '../src/pages/leader/order-adjustment-utils.mjs';

test('携带物料仅展示计划物料', () => {
  assert.deepEqual(
    buildVisiblePlannedMaterials([
      { id: 1, material_name: '除胶剂', quantity: 1, is_extra: 0 },
      { id: 2, material_name: '补充毛巾', quantity: 2, is_extra: 1 },
      { id: 3, material_name: '抹布', quantity: 1 },
    ]),
    [
      { id: 1, material_name: '除胶剂', quantity: 1, is_extra: 0 },
      { id: 3, material_name: '抹布', quantity: 1 },
    ],
  );
});

test('服务名称输入框会按关键字过滤联想项', () => {
  assert.deepEqual(
    buildServiceSuggestionList(
      [
        { id: 18, name: '深度保洁' },
        { id: 19, name: '玻璃清洁' },
        { id: 20, name: '柜体整理' },
      ],
      '清',
    ),
    [
      { id: 19, name: '玻璃清洁' },
    ],
  );
});

test('当输入内容已偏离已选服务时清空 service_item_id', () => {
  assert.equal(
    syncSelectedServiceId(
      [
        { id: 18, name: '深度保洁' },
      ],
      18,
      '深度保洁升级版',
    ),
    0,
  );
});

test('增项服务在选择服务库项时提交 service_item_id', () => {
  assert.deepEqual(
    buildServiceAdjustmentPayload({
      serviceItemId: 18,
      serviceName: '深度保洁',
      adjustAmount: '66.5',
      remark: '服务库增项',
    }),
    {
      adjust_type: 1,
      service_item_id: 18,
      adjust_amount: 66.5,
      remark: '服务库增项',
    },
  );
});

test('增项服务在手工输入时提交 service_name', () => {
  assert.deepEqual(
    buildServiceAdjustmentPayload({
      serviceItemId: 0,
      serviceName: '柜体深度整理',
      adjustAmount: '88',
      remark: '',
    }),
    {
      adjust_type: 1,
      service_name: '柜体深度整理',
      adjust_amount: 88,
      remark: '',
    },
  );
});

test('仅服务中订单允许显示增项改删按钮', () => {
  assert.equal(canEditAdjustmentActions({ status: 40 }), true);
  assert.equal(canEditAdjustmentActions({ status: 60 }), false);
});

test('服务增项编辑态会回填原类型数据并锁定为服务模式', () => {
  assert.deepEqual(
    buildAdjustmentEditDraft({
      id: 11,
      adjust_type: 1,
      service_item_id: 18,
      service_name: '深度保洁',
      adjust_amount: 88,
      remark: '原备注',
    }),
    {
      mode: 'service',
      form: {
        service_item_id: 18,
        service_name: '深度保洁',
        material_id: 0,
        material_name: '',
        material_quantity: '1',
        adjust_amount: '88',
        remark: '原备注',
      },
    },
  );
});

test('增补物料编辑态会回填原类型数据并锁定为物料模式', () => {
  assert.deepEqual(
    buildAdjustmentEditDraft({
      id: 12,
      adjust_type: 3,
      material_id: 9,
      material_name: '除胶剂',
      material_quantity: 2,
      adjust_amount: 30,
      remark: '',
    }),
    {
      mode: 'material',
      form: {
        service_item_id: 0,
        service_name: '',
        material_id: 9,
        material_name: '除胶剂',
        material_quantity: '2',
        adjust_amount: '30',
        remark: '',
      },
    },
  );
});
