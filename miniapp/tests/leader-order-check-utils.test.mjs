import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canEditChecklist,
  buildStaffConfirmPayload,
  buildMaterialConfirmPayload,
  buildChecklistSummary,
} from '../src/pages/leader/order-check-utils.mjs';

test('仅服务中订单允许编辑人员物料清点', () => {
  assert.equal(canEditChecklist({ status: 40 }), true);
  assert.equal(canEditChecklist({ status: 30 }), false);
  assert.equal(canEditChecklist({ status: 60 }), false);
});

test('人员确认提交参数会归一化布尔值并清洗统一备注', () => {
  assert.deepEqual(
    buildStaffConfirmPayload({
      employees: [
        { employee_id: 101, arrived: true },
        { employee_id: 102, arrived: false },
      ],
      remark: ' 1 人迟到未到场 ',
    }),
    {
      employees: [
        { employee_id: 101, arrived: true },
        { employee_id: 102, arrived: false },
      ],
      remark: '1 人迟到未到场',
    },
  );
});

test('物料清点提交参数会使用 order_material_id 并清洗统一备注', () => {
  assert.deepEqual(
    buildMaterialConfirmPayload({
      materials: [
        { id: 11, checked: 1 },
        { id: 12, checked: 0 },
      ],
      remark: ' 清洁剂缺 1 瓶 ',
    }),
    {
      materials: [
        { order_material_id: 11, checked: true },
        { order_material_id: 12, checked: false },
      ],
      remark: '清洁剂缺 1 瓶',
    },
  );
});

test('清点汇总会分别统计人员未到岗数与物料缺失数', () => {
  assert.deepEqual(
    buildChecklistSummary({
      employees: [
        { employee_id: 101, arrived_at: '2026-07-27 10:00:00' },
        { employee_id: 102, arrived_at: null },
      ],
      materials: [
        { id: 11, checked: 1 },
        { id: 12, checked: 0 },
      ],
    }),
    {
      missing_staff_count: 1,
      missing_material_count: 1,
    },
  );
});
