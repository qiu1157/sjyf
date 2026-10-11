export const LEADER_PHOTO_SPACES = [
  '玄关',
  '客厅',
  '厨房',
  '主卧衣柜',
  '次卧/儿童房',
  '卫生间',
  '其他区域',
];

function buildBackAction(stackSize, fallbackUrl, fallbackType = 'redirectTo') {
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

export function getWorkbenchBackAction(stackSize) {
  return buildBackAction(stackSize, '/pages/mine/mine', 'switchTab');
}

export function getLeaderOrderBackAction(stackSize) {
  return buildBackAction(stackSize, '/pages/leader/workbench', 'redirectTo');
}

export function getLeaderPhotoBackAction(stackSize, orderId) {
  return buildBackAction(stackSize, `/pages/leader/order?id=${orderId}`, 'redirectTo');
}

export function buildLeaderPhotoSpaces(customSpaces = [], photos = []) {
  const names = new Set(LEADER_PHOTO_SPACES);

  for (const item of customSpaces) {
    const name = String(item || '').trim();
    if (name) {
      names.add(name);
    }
  }

  for (const item of photos) {
    const name = String(item?.space_name || '').trim();
    if (name) {
      names.add(name);
    }
  }

  return Array.from(names);
}

export function runBackAction(action) {
  if (!action) return;

  if (action.type === 'navigateBack') {
    uni.navigateBack({ delta: action.delta || 1 });
    return;
  }

  if (action.type === 'switchTab') {
    uni.switchTab({ url: action.url });
    return;
  }

  uni.redirectTo({ url: action.url });
}
