function buildBackAction(stackSize, fallbackUrl, fallbackType = 'switchTab') {
  if (stackSize > 1) {
    return {
      type: 'navigateBack',
      delta: 1,
    };
  }

  return {
    type: fallbackType,
    url: fallbackUrl,
  };
}

export function getOrderPageBackAction(stackSize) {
  return buildBackAction(stackSize, '/pages/mine/mine', 'switchTab');
}

export function getOrderDetailBackAction(stackSize) {
  return buildBackAction(stackSize, '/pages/order/order', 'switchTab');
}
