export function canEditChecklist(order = {}) {
  return Number(order?.status) === 40;
}

export function buildStaffConfirmPayload({ employees = [], remark = '' } = {}) {
  return {
    employees: employees.map((item) => ({
      employee_id: Number(item?.employee_id || 0),
      arrived: item?.arrived === true,
    })),
    remark: String(remark || '').trim(),
  };
}

export function buildMaterialConfirmPayload({ materials = [], remark = '' } = {}) {
  return {
    materials: materials.map((item) => ({
      order_material_id: Number(item?.id || item?.order_material_id || 0),
      checked: Number(item?.checked || 0) === 1 || item?.checked === true,
    })),
    remark: String(remark || '').trim(),
  };
}

export function buildChecklistSummary({ employees = [], materials = [] } = {}) {
  return {
    missing_staff_count: employees.filter((item) => !item?.arrived_at && item?.arrived !== true).length,
    missing_material_count: materials.filter((item) => !(Number(item?.checked || 0) === 1 || item?.checked === true)).length,
  };
}
