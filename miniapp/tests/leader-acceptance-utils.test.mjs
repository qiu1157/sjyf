import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAcceptanceSummary,
  canSubmitAcceptance,
  normalizeAcceptanceHours,
} from '../src/pages/leader/acceptance-utils.mjs';

test('工时汇总会计算实际总工时与差异', () => {
  assert.deepEqual(
    buildAcceptanceSummary({
      planHours: 3,
      planActualHours: 2.5,
      extraActualHours: 1,
    }),
    {
      plan_hours: 3,
      plan_actual_hours: 2.5,
      extra_actual_hours: 1,
      actual_hours: 3.5,
      diff_hours: 0.5,
    },
  );
});

test('双工时都填写后才允许提交，0 也视为已填写', () => {
  assert.equal(canSubmitAcceptance(0, 0), true);
  assert.equal(canSubmitAcceptance(2, 0), true);
  assert.equal(canSubmitAcceptance('', 0), false);
  assert.equal(canSubmitAcceptance(2, undefined), false);
});

test('工时输入归一化时保留合法数字并过滤空值', () => {
  assert.equal(normalizeAcceptanceHours('2.5'), 2.5);
  assert.equal(normalizeAcceptanceHours(0), 0);
  assert.equal(normalizeAcceptanceHours(''), null);
  assert.equal(normalizeAcceptanceHours('abc'), null);
  assert.equal(normalizeAcceptanceHours(-1), null);
});
