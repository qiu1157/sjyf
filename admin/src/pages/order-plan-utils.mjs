const DEFAULT_BOOK_TIME_OPTIONS = ['09:00-13:00', '13:00-17:00', '17:00-21:00'];

function parseServicePlanDetail(rawDetail) {
  if (!rawDetail) {
    return { areas: [] };
  }

  try {
    const parsed = typeof rawDetail === 'string' ? JSON.parse(rawDetail) : rawDetail;
    return {
      areas: Array.isArray(parsed?.areas) ? parsed.areas : [],
    };
  } catch {
    return { areas: [] };
  }
}

function buildAreaFormValues(rawDetail, planAreas = []) {
  const { areas } = parseServicePlanDetail(rawDetail);

  return planAreas.map((area) => {
    const matched = areas.find((item) => item?.area_key === area.key);
    return {
      area_key: area.key,
      area_name: area.name,
      plan_hours: matched?.plan_hours ?? 0,
      plan_content: matched?.plan_content ?? '',
    };
  });
}

function buildMaterialFormValues(orderMaterials = []) {
  return orderMaterials
    .filter((item) => Number(item?.is_extra || 0) !== 1)
    .map((item) => ({
      material_id: item.material_id,
      quantity: item.quantity,
    }));
}

export function buildPlanFormInitialValues({ order = {}, employees = [], materials = [], planAreas = [] }) {
  return {
    leader_id: order?.leader_id || undefined,
    employee_ids: employees
      .filter((item) => Number(item?.employee_id || 0) !== Number(order?.leader_id || 0))
      .map((item) => item.employee_id),
    book_date: typeof order?.book_date === 'string' ? order.book_date : undefined,
    book_time: typeof order?.book_time === 'string' ? order.book_time : undefined,
    material_list: buildMaterialFormValues(materials),
    areas: buildAreaFormValues(order?.service_plan_detail, planAreas),
  };
}

export function buildOrderPlanPayload({ orderStatus, values = {}, planAreas = [] }) {
  const payload = {
    leader_id: values.leader_id,
    employee_ids: Array.isArray(values.employee_ids) ? values.employee_ids : [],
    material_list: (values.material_list || [])
      .filter((item) => item?.material_id)
      .map((item) => ({
        material_id: item.material_id,
        quantity: Number(item.quantity || 1),
      })),
    service_plan_detail: {
      areas: planAreas.map((area, index) => ({
        area_key: area.key,
        area_name: area.name,
        plan_hours: Number(values.areas?.[index]?.plan_hours || 0),
        plan_content: values.areas?.[index]?.plan_content || '',
      })),
    },
  };

  if (Number(orderStatus) === 20) {
    payload.book_date = values.book_date;
    payload.book_time = values.book_time;
  }

  return payload;
}

export function buildBookTimeOptions(currentBookTime) {
  const options = [...DEFAULT_BOOK_TIME_OPTIONS];
  const normalizedCurrent = typeof currentBookTime === 'string' ? currentBookTime.trim() : '';
  if (normalizedCurrent && !options.includes(normalizedCurrent)) {
    options.push(normalizedCurrent);
  }
  return options.map((value) => ({ value, label: value }));
}
