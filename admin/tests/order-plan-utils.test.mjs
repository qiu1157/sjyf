import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlanFormInitialValues,
  buildOrderPlanPayload,
  buildBookTimeOptions,
} from '../src/pages/order-plan-utils.mjs';

test('buildPlanFormInitialValues 会回填接单时改期需要的预约字段', () => {
  const result = buildPlanFormInitialValues({
    order: {
      status: 20,
      leader_id: 11,
      book_date: '2026-07-29',
      book_time: '13:00-17:00',
      service_plan_detail: JSON.stringify({
        areas: [
          { area_key: 'entrance', plan_hours: 0.5, plan_content: '玄关除尘' },
        ],
      }),
    },
    employees: [
      { employee_id: 11 },
      { employee_id: 12 },
    ],
    materials: [
      { material_id: 201, quantity: 2, is_extra: 0 },
      { material_id: 202, quantity: 1, is_extra: 1 },
    ],
    planAreas: [
      { key: 'entrance', name: '玄关' },
      { key: 'living_room', name: '客厅' },
    ],
  });

  assert.deepEqual(result, {
    leader_id: 11,
    employee_ids: [12],
    book_date: '2026-07-29',
    book_time: '13:00-17:00',
    material_list: [
      { material_id: 201, quantity: 2 },
    ],
    areas: [
      { area_key: 'entrance', area_name: '玄关', plan_hours: 0.5, plan_content: '玄关除尘' },
      { area_key: 'living_room', area_name: '客厅', plan_hours: 0, plan_content: '' },
    ],
  });
});

test('buildOrderPlanPayload 在待接单时会带上改期字段', () => {
  const result = buildOrderPlanPayload({
    orderStatus: 20,
    values: {
      leader_id: 11,
      employee_ids: [12],
      book_date: '2026-07-29',
      book_time: '13:00-17:00',
      material_list: [
        { material_id: 201, quantity: '2' },
        { material_id: null, quantity: '1' },
      ],
      areas: [
        { plan_hours: '0.5', plan_content: '玄关除尘' },
        { plan_hours: 1, plan_content: '' },
      ],
    },
    planAreas: [
      { key: 'entrance', name: '玄关' },
      { key: 'living_room', name: '客厅' },
    ],
  });

  assert.deepEqual(result, {
    leader_id: 11,
    employee_ids: [12],
    book_date: '2026-07-29',
    book_time: '13:00-17:00',
    material_list: [
      { material_id: 201, quantity: 2 },
    ],
    service_plan_detail: {
      areas: [
        { area_key: 'entrance', area_name: '玄关', plan_hours: 0.5, plan_content: '玄关除尘' },
        { area_key: 'living_room', area_name: '客厅', plan_hours: 1, plan_content: '' },
      ],
    },
  });
});

test('buildOrderPlanPayload 在非待接单状态下不会追加改期字段', () => {
  const result = buildOrderPlanPayload({
    orderStatus: 30,
    values: {
      leader_id: 11,
      employee_ids: [12],
      book_date: '2026-07-29',
      book_time: '13:00-17:00',
      material_list: [],
      areas: [
        { plan_hours: 1, plan_content: '' },
      ],
    },
    planAreas: [
      { key: 'entrance', name: '玄关' },
    ],
  });

  assert.deepEqual(result, {
    leader_id: 11,
    employee_ids: [12],
    material_list: [],
    service_plan_detail: {
      areas: [
        { area_key: 'entrance', area_name: '玄关', plan_hours: 1, plan_content: '' },
      ],
    },
  });
});

test('buildBookTimeOptions 会补齐当前订单的非预设时段', () => {
  assert.deepEqual(
    buildBookTimeOptions('08:00-12:00').map((item) => item.value),
    ['09:00-13:00', '13:00-17:00', '17:00-21:00', '08:00-12:00'],
  );
});
