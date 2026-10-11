function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}

export const CANCEL_REASON_OPTIONS = ['时间冲突', '下错单', '不想要了', '其它'];

export function parseAddressSnapshot(snapshot) {
  if (!snapshot) return {};
  if (typeof snapshot === 'object') return { ...snapshot };

  try {
    return JSON.parse(snapshot);
  } catch (_error) {
    return {};
  }
}

export function getDisplayAddress(snapshot) {
  const parsed = parseAddressSnapshot(snapshot);
  return String(
    parsed.full_address
      || parsed.service_address
      || [
        parsed.province,
        parsed.city,
        parsed.district,
        parsed.detail,
      ].filter(Boolean).join(''),
  ).trim();
}

export function buildFeeSummary(order = {}) {
  return {
    service_price: formatAmount(order.service_price),
    first_payment: formatAmount(order.first_payment),
    extra_amount: formatAmount(order.extra_amount),
    final_payment: formatAmount(order.final_payment),
  };
}

export function shouldShowFinalPayButton(order = {}) {
  return Number(order?.status) === 60 && Number(order?.extra_amount || 0) > 0;
}

export function shouldShowCancelButton(order = {}) {
  return [10, 20, 30].includes(Number(order?.status));
}

export function getCancelSubmitMessage(status) {
  return Number(status) === 10 ? '订单已取消' : '已提交取消申请，等待主管审核';
}

export function buildAdjustmentDisplayList(adjustments = []) {
  return adjustments.map((item) => {
    let title = '临时增项';
    if (Number(item?.adjust_type) === 1) {
      title = `增项服务：${String(item?.service_name || '未命名服务').trim()}`;
    } else if (Number(item?.adjust_type) === 3) {
      title = `增补物料：${String(item?.material_name || '未命名物料').trim()} x${Number(item?.material_quantity || 0)}`;
    }

    const remark = String(item?.remark || '').trim();
    return {
      id: item.id,
      title,
      amount: formatAmount(item?.adjust_amount),
      created_at: item?.created_at,
      ...(remark ? { remark } : {}),
    };
  });
}
