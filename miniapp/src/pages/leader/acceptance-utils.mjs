export function normalizeAcceptanceHours(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) {
    return null;
  }

  return Number(hours.toFixed(1));
}

export function canSubmitAcceptance(planActualHours, extraActualHours) {
  return normalizeAcceptanceHours(planActualHours) !== null
    && normalizeAcceptanceHours(extraActualHours) !== null;
}

export function buildAcceptanceSummary({
  planHours = 0,
  planActualHours = 0,
  extraActualHours = 0,
} = {}) {
  const safePlanHours = Number(Number(planHours || 0).toFixed(1));
  const safePlanActualHours = Number(Number(planActualHours || 0).toFixed(1));
  const safeExtraActualHours = Number(Number(extraActualHours || 0).toFixed(1));
  const actualHours = Number((safePlanActualHours + safeExtraActualHours).toFixed(1));
  const diffHours = Number((actualHours - safePlanHours).toFixed(1));

  return {
    plan_hours: safePlanHours,
    plan_actual_hours: safePlanActualHours,
    extra_actual_hours: safeExtraActualHours,
    actual_hours: actualHours,
    diff_hours: diffHours,
  };
}
