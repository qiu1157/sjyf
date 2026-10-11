const STATUS_TEXT_MAP = {
  10: '待支付',
  20: '待接单',
  30: '待上门',
  40: '服务中',
  60: '待付尾款',
  80: '已完成',
  90: '已取消',
  91: '待取消',
};

const ROLE_TEXT_MAP = {
  0: '用户',
  1: '主管',
  2: '主管',
  3: '主管',
  4: '领队',
  5: '员工',
};

function formatAmount(value) {
  const amount = Number(value || 0);
  if (amount < 0) {
    return `-¥${Math.abs(amount).toFixed(2)}`;
  }
  return `+¥${amount.toFixed(2)}`;
}

function getOperatorName(item = {}) {
  const name = String(item.operator_name || '').trim();
  if (name) {
    return name;
  }
  return ROLE_TEXT_MAP[Number(item.operator_role)] || '系统';
}

export function buildAdjustmentTraceRows(adjustments = []) {
  return adjustments.map((item) => {
    const adjustType = Number(item?.adjust_type || 0);
    let adjust_type_text = '临时增项';
    let content_text = String(item?.service_name || item?.material_name || '-').trim() || '-';

    if (adjustType === 1) {
      adjust_type_text = '增项服务';
    } else if (adjustType === 2) {
      adjust_type_text = '调价';
    } else if (adjustType === 3) {
      adjust_type_text = '增补物料';
      content_text = `${String(item?.material_name || '-').trim() || '-'} x${Number(item?.material_quantity || 0)}`;
    }

    return {
      id: item.id,
      operator_name: getOperatorName(item),
      created_at: item.created_at,
      adjust_type_text,
      content_text,
      amount_text: formatAmount(item.adjust_amount),
      remark: String(item?.remark || '').trim(),
    };
  });
}

export function buildHistoryTimelineItems(histories = []) {
  const payload = Array.isArray(histories) ? { histories } : (histories || {});
  const order = payload.order || {};
  const historyList = Array.isArray(payload.histories) ? payload.histories : [];
  const items = [];

  if (order.created_at) {
    items.push({
      id: 'created_at',
      title: '订单创建',
      operator_name: '系统',
      time: order.created_at,
      content_text: '订单已创建',
      remark: '',
    });
  }
  if (order.first_pay_time) {
    items.push({
      id: 'first_pay_time',
      title: '首款已付',
      operator_name: '用户',
      time: order.first_pay_time,
      content_text: `支付 ¥${Number(order.first_payment || 0)}`,
      remark: '',
    });
  }
  if (order.cancel_apply_time) {
    items.push({
      id: 'cancel_apply_time',
      title: '用户取消',
      operator_name: '用户',
      time: order.cancel_apply_time,
      content_text: '已提交取消申请',
      remark: String(order.cancel_reason || '').trim(),
    });
  }
  if (order.accept_time) {
    items.push({
      id: 'accept_time',
      title: '主管接单',
      operator_name: '主管',
      time: order.accept_time,
      content_text: '主管已接单分配',
      remark: '',
    });
  }
  if (order.sign_in_time) {
    items.push({
      id: 'sign_in_time',
      title: '服务中',
      operator_name: '领队',
      time: order.sign_in_time,
      content_text: '领队已到达现场并开始服务',
      remark: '',
    });
  }
  if (order.complete_time) {
    items.push({
      id: 'complete_time',
      title: '服务完成',
      operator_name: '系统',
      time: order.complete_time,
      content_text: '服务已完成',
      remark: '',
    });
  }
  if (order.final_pay_time) {
    items.push({
      id: 'final_pay_time',
      title: '尾款已付',
      operator_name: '用户',
      time: order.final_pay_time,
      content_text: `支付 ¥${Number(order.final_payment || 0)}`,
      remark: '',
    });
  }
  if (order.cancel_time) {
    items.push({
      id: 'cancel_time',
      title: '订单取消',
      operator_name: '系统',
      time: order.cancel_time,
      content_text: '订单已取消',
      remark: String(order.cancel_reason || order.cancel_audit_remark || '').trim(),
    });
  }

  historyList.forEach((item) => {
    const historyType = Number(item?.history_type || 0);
    if (historyType !== 2) {
      return;
    }
    const fromValue = String(item?.from_value || '').trim();
    const toValue = String(item?.to_value || '').trim();
    items.push({
      id: item.id,
      title: '改期记录',
      operator_name: getOperatorName(item),
      time: item.created_at,
      content_text: `${fromValue || '-'} -> ${toValue || '-'}`,
      remark: String(item?.remark || '').trim(),
    });
  });

  return items
    .filter((item) => item.time)
    .sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());
}

export function groupPhotosBySpace(photos = []) {
  const spaceMap = new Map();

  photos.forEach((item) => {
    const photoUrl = String(item?.photo_url || item?.url || '').trim();
    if (!photoUrl) {
      return;
    }

    const spaceName = String(item?.space_name || '').trim() || '未分组空间';
    if (!spaceMap.has(spaceName)) {
      spaceMap.set(spaceName, {
        space_name: spaceName,
        before: [],
        after: [],
      });
    }

    const group = spaceMap.get(spaceName);
    if (Number(item?.photo_type) === 2) {
      group.after.push(item);
    } else {
      group.before.push(item);
    }
  });

  return Array.from(spaceMap.values());
}
