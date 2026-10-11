export function buildVisiblePlannedMaterials(materials = []) {
  return materials.filter((item) => Number(item?.is_extra || 0) !== 1);
}

export function buildServiceSuggestionList(services = [], keyword = '') {
  const trimmedKeyword = String(keyword || '').trim();
  if (!trimmedKeyword) {
    return services.map((item) => ({ ...item }));
  }

  return services
    .filter((item) => String(item?.name || '').includes(trimmedKeyword))
    .map((item) => ({ ...item }));
}

export function syncSelectedServiceId(services = [], selectedServiceId = 0, currentServiceName = '') {
  if (!selectedServiceId) {
    return 0;
  }

  const selected = services.find((item) => item.id === selectedServiceId);
  if (!selected) {
    return 0;
  }

  return String(selected.name || '').trim() === String(currentServiceName || '').trim()
    ? selectedServiceId
    : 0;
}

export function buildServiceAdjustmentPayload({
  serviceItemId,
  serviceName,
  adjustAmount,
  remark,
}) {
  const payload = {
    adjust_type: 1,
    adjust_amount: Number(adjustAmount || 0),
    remark: String(remark || '').trim(),
  };

  if (Number(serviceItemId || 0) > 0) {
    return {
      ...payload,
      service_item_id: Number(serviceItemId || 0),
    };
  }

  return {
    ...payload,
    service_name: String(serviceName || '').trim(),
  };
}

export function buildMaterialAdjustmentPayload({
  materialId,
  adjustAmount,
  materialQuantity,
  remark,
}) {
  return {
    adjust_type: 3,
    material_id: Number(materialId || 0),
    material_quantity: Number(materialQuantity || 0),
    adjust_amount: Number(adjustAmount || 0),
    remark: String(remark || '').trim(),
  };
}

export function canEditAdjustmentActions(order = {}) {
  return Number(order?.status) === 40;
}

export function buildAdjustmentEditDraft(adjustment = {}) {
  const mode = Number(adjustment?.adjust_type || 0) === 3 ? 'material' : 'service';
  return {
    mode,
    form: {
      service_item_id: Number(adjustment?.service_item_id || 0),
      service_name: String(adjustment?.service_name || '').trim(),
      material_id: Number(adjustment?.material_id || 0),
      material_name: String(adjustment?.material_name || '').trim(),
      material_quantity: String(adjustment?.material_quantity || 1),
      adjust_amount: String(adjustment?.adjust_amount ?? ''),
      remark: String(adjustment?.remark || '').trim(),
    },
  };
}
