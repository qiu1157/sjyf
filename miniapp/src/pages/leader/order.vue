<template>
  <view v-if="detail" class="page">
    <view class="page-header">
      <view class="header-btn" @click="goBack">‹</view>
      <view class="header-title">订单详情</view>
      <view></view>
    </view>

    <view class="card">
      <view class="section-title">订单信息</view>
      <view class="info-row"><text class="label">订单号</text><text class="value">{{ order.order_no }}</text></view>
      <view class="info-row"><text class="label">服务项目</text><text class="value">{{ order.service_name }}</text></view>
      <view class="info-row"><text class="label">预约日期</text><text class="value">{{ order.book_date }}</text></view>
      <view class="info-row"><text class="label">预约时段</text><text class="value">{{ order.book_time }}</text></view>
      <view class="info-row"><text class="label">订单状态</text><text class="value primary">{{ statusText }}</text></view>
    </view>

    <view class="card">
      <view class="section-title">客户信息</view>
      <view class="info-row"><text class="label">联系人</text><text class="value">{{ contactName }}</text></view>
      <view class="info-row"><text class="label">联系电话</text><text class="value">{{ contactPhone }}</text></view>
      <view class="info-row is-top"><text class="label">服务地址</text><text class="value multi">{{ serviceAddress }}</text></view>
      <view class="info-row is-top"><text class="label">用户备注</text><text class="value multi">{{ order.user_remark || '—' }}</text></view>
    </view>

    <view class="card">
      <view class="section-title">上门信息</view>
      <view class="info-row"><text class="label">服务日期</text><text class="value">{{ order.book_date }}</text></view>
      <view class="info-row"><text class="label">服务时段</text><text class="value">{{ order.book_time }}</text></view>
      <view class="info-row is-top"><text class="label">上门地址</text><text class="value multi">{{ serviceAddress }}</text></view>
    </view>

    <view class="card">
      <view class="section-title">服务方案</view>
      <view class="summary-box">
        <view class="summary-item">
          <text class="summary-label">计划工时汇总</text>
          <text class="summary-value">{{ order.plan_hours || 0 }} 小时</text>
        </view>
      </view>
      <view class="plan-table">
        <view class="plan-head">
          <text class="col-area">区域</text>
          <text class="col-hours">计划工时</text>
          <text class="col-content">方案内容</text>
        </view>
        <view v-if="planAreas.length">
          <view class="plan-row" v-for="item in planAreas" :key="item.area_key">
            <text class="col-area">{{ item.area_name }}</text>
            <text class="col-hours">{{ item.plan_hours || 0 }} 小时</text>
            <text class="col-content">{{ item.plan_content || '—' }}</text>
          </view>
        </view>
        <view v-else class="empty-text">暂未制定区域方案</view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">服务人员</view>
      <view v-if="staffChecks.length">
        <view class="check-item" v-for="e in staffChecks" :key="e.id">
          <view class="check-item-head">
            <view class="check-main">
              <text class="check-name">{{ e.employee?.name || '—' }}</text>
              <text class="badge" :class="e.is_leader ? 'badge-leader' : 'badge-member'">{{ e.is_leader ? '领队' : '员工' }}</text>
            </view>
            <text class="check-status" :class="isStaffArrived(e) ? 'is-ok' : 'is-missing'">
              {{ isStaffArrived(e) ? '已到岗' : '未到岗' }}
            </text>
          </view>
          <view v-if="e.arrived_at" class="check-time">确认时间：{{ formatDateTime(e.arrived_at) }}</view>
          <view v-if="checklistEditable" class="check-action-group">
            <view
              class="check-action"
              :class="{ active: isStaffArrived(e) }"
              @click="setStaffArrived(e.id, true)"
            >
              已到岗
            </view>
            <view
              class="check-action danger"
              :class="{ active: !isStaffArrived(e) }"
              @click="setStaffArrived(e.id, false)"
            >
              未到岗
            </view>
          </view>
        </view>
        <view class="summary-box checklist-summary">
          <view class="summary-item">
            <text class="summary-label">未到岗人数</text>
            <text class="summary-value">{{ checklistSummary.missing_staff_count }} 人</text>
          </view>
        </view>
        <view class="field-label">人员异常备注</view>
        <textarea
          v-model="staffCheckRemark"
          class="textarea-field"
          maxlength="100"
          :disabled="!checklistEditable"
          placeholder="如有缺员、迟到、替班等情况，请统一备注"
        />
        <view v-if="checklistEditable" class="btn-default btn-inline" @click="submitStaffChecklist">保存人员确认</view>
      </view>
      <view v-else class="empty-text">暂无服务人员</view>
    </view>

    <view class="card">
      <view class="section-title">携带物料</view>
      <view v-if="materialChecks.length">
        <view class="check-item" v-for="m in materialChecks" :key="m.id">
          <view class="check-item-head">
            <view class="check-main">
              <text class="check-name">{{ m.material_name }}</text>
              <text class="check-qty">x {{ m.quantity }}</text>
            </view>
            <text class="check-status" :class="isMaterialChecked(m) ? 'is-ok' : 'is-missing'">
              {{ isMaterialChecked(m) ? '已清点' : '有缺失' }}
            </text>
          </view>
          <view v-if="m.checked_at" class="check-time">确认时间：{{ formatDateTime(m.checked_at) }}</view>
          <view v-if="checklistEditable" class="check-action-group">
            <view
              class="check-action"
              :class="{ active: isMaterialChecked(m) }"
              @click="setMaterialChecked(m.id, true)"
            >
              已清点
            </view>
            <view
              class="check-action danger"
              :class="{ active: !isMaterialChecked(m) }"
              @click="setMaterialChecked(m.id, false)"
            >
              有缺失
            </view>
          </view>
        </view>
        <view class="summary-box checklist-summary">
          <view class="summary-item">
            <text class="summary-label">缺失物料数</text>
            <text class="summary-value">{{ checklistSummary.missing_material_count }} 项</text>
          </view>
        </view>
        <view class="field-label">物料异常备注</view>
        <textarea
          v-model="materialCheckRemark"
          class="textarea-field"
          maxlength="100"
          :disabled="!checklistEditable"
          placeholder="如有少带、损坏、替换等情况，请统一备注"
        />
        <view v-if="checklistEditable" class="btn-default btn-inline" @click="submitMaterialChecklist">保存物料清点</view>
      </view>
      <view v-else class="empty-text">暂无物料清单</view>
    </view>

    <view class="card">
      <view class="section-title">临时增项记录</view>
      <view v-if="adjustments.length">
        <view class="adjustment-item" v-for="item in adjustments" :key="item.id">
          <view class="adjustment-head">
            <text class="adjustment-title">{{ getAdjustmentTitle(item) }}</text>
            <text class="adjustment-amount">¥{{ formatAmount(item.adjust_amount) }}</text>
          </view>
          <view class="adjustment-meta">
            <text>{{ getAdjustmentTypeText(item.adjust_type) }}</text>
            <text>{{ item.operator_name || '领队' }}</text>
            <text>{{ formatDateTime(item.created_at) }}</text>
          </view>
          <view v-if="item.material_quantity" class="adjustment-desc">数量：{{ item.material_quantity }}</view>
          <view v-if="item.remark" class="adjustment-desc">备注：{{ item.remark }}</view>
          <view v-if="adjustmentEditable" class="adjustment-actions">
            <view class="adjustment-action" @click="editAdjustment(item)">修改</view>
            <view class="adjustment-action danger" @click="removeAdjustment(item)">删除</view>
          </view>
        </view>
      </view>
      <view v-else class="empty-text">暂无临时增项记录</view>
    </view>

    <view class="footer safe-bottom">
      <view v-if="order.status === 30" class="btn-primary" @click="signIn">上门签到</view>
      <view v-if="order.status === 40" class="btn-default" @click="goPhoto">拍摄服务照片</view>
      <view v-if="order.status === 40" class="btn-default" @click="addExtra">增项/调价/增补物料</view>
      <view v-if="order.status === 40" class="btn-primary" @click="goAcceptance">提交验收</view>
    </view>

    <view v-if="adjustmentModalVisible" class="modal-mask" @click="closeAdjustmentModal">
      <view class="modal-card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEditingAdjustment ? '修改临时增项' : '临时增项' }}</text>
          <text class="modal-close" @click="closeAdjustmentModal">×</text>
        </view>

        <view v-if="!isEditingAdjustment" class="mode-tabs">
          <view
            v-for="item in adjustmentModes"
            :key="item.value"
            class="mode-tab"
            :class="{ active: adjustmentMode === item.value }"
            @click="switchAdjustmentMode(item.value)"
          >
            {{ item.label }}
          </view>
        </view>

        <view v-if="adjustmentMode === 'service'">
          <view class="form-block">
            <view class="field-label">服务名称</view>
            <view class="autocomplete-box">
              <input
              v-model="adjustmentForm.service_name"
              class="input-field"
              maxlength="50"
              confirm-type="done"
              placeholder="请输入自定义服务名称"
              @focus="openServiceSuggestions"
              @input="onServiceNameInput"
            />
              <scroll-view
                v-if="showServiceSuggestions && filteredServiceSuggestions.length"
                class="suggestion-panel"
                scroll-y
                enable-flex
              >
                <view
                  v-for="item in filteredServiceSuggestions"
                  :key="item.id"
                  class="suggestion-item"
                  @click="selectSuggestedService(item)"
                >
                  <text>{{ item.name }}</text>
                  <text class="suggestion-price">¥{{ formatAmount(item.price || item.promo_price) }}</text>
                </view>
              </scroll-view>
            </view>
          </view>
        </view>

        <view class="form-block" v-if="adjustmentMode === 'material'">
          <view class="field-label">物料名称</view>
          <picker mode="selector" :range="materialOptions" @change="onMaterialPick">
            <view class="picker-field">{{ adjustmentForm.material_name || '请选择增补物料' }}</view>
          </picker>
          <view class="field-label mt-12">物料数量</view>
          <input v-model="adjustmentForm.material_quantity" class="input-field" type="number" placeholder="请输入数量" />
        </view>

        <view class="form-block">
          <view class="field-label">{{ adjustmentMode === 'material' ? '费用金额' : '服务金额' }}</view>
          <input v-model="adjustmentForm.adjust_amount" class="input-field" type="digit" placeholder="请输入金额" />
        </view>

        <view class="form-block">
          <view class="field-label">备注</view>
          <textarea
            v-model="adjustmentForm.remark"
            class="textarea-field"
            maxlength="100"
            placeholder="请输入备注，可不填"
          />
        </view>

        <view class="modal-footer">
          <view class="modal-btn btn-cancel" @click="closeAdjustmentModal">取消</view>
          <view class="modal-btn btn-confirm" @click="submitAdjustment">确认</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api } from '../../utils/request';
import { getLeaderOrderBackAction, runBackAction } from './page-utils.mjs';
import {
  buildServiceAdjustmentPayload,
  buildMaterialAdjustmentPayload,
  canEditAdjustmentActions,
  buildAdjustmentEditDraft,
  buildServiceSuggestionList,
  buildVisiblePlannedMaterials,
  syncSelectedServiceId,
} from './order-adjustment-utils.mjs';
import {
  canEditChecklist,
  buildStaffConfirmPayload,
  buildMaterialConfirmPayload,
  buildChecklistSummary,
} from './order-check-utils.mjs';

const id = ref(0);
const detail = ref<any>(null);
const order = computed(() => detail.value?.order);
const employees = computed(() => detail.value?.employees || []);
const materials = computed(() => detail.value?.materials || []);
const plannedMaterials = computed(() => buildVisiblePlannedMaterials(materials.value));
const adjustments = computed(() => detail.value?.adjustments || []);
const staffChecks = ref<any[]>([]);
const materialChecks = ref<any[]>([]);
const staffCheckRemark = ref('');
const materialCheckRemark = ref('');
const addressSnapshot = computed(() => {
  if (!order.value?.address_snapshot) return null;
  try {
    return JSON.parse(order.value.address_snapshot);
  } catch {
    return null;
  }
});
const planAreas = computed(() => {
  if (!order.value?.service_plan_detail) return [];
  try {
    const parsed = JSON.parse(order.value.service_plan_detail);
    return Array.isArray(parsed?.areas) ? parsed.areas : [];
  } catch {
    return [];
  }
});
const contactName = computed(() => addressSnapshot.value?.contact_name || order.value?.contact_name || '—');
const contactPhone = computed(() => addressSnapshot.value?.contact_phone || order.value?.contact_phone || '—');
const serviceAddress = computed(() => {
  const snapshot = addressSnapshot.value;
  if (!snapshot) return '—';
  return snapshot.full_address
    || snapshot.service_address
    || [snapshot.province, snapshot.city, snapshot.district, snapshot.detail].filter(Boolean).join('')
    || '—';
});
const statusText = computed(() => ({ 30:'待上门', 40:'服务中', 60:'待付尾款', 80:'已完成', 90:'已取消' } as any)[order.value?.status] || '');
const checklistEditable = computed(() => canEditChecklist(order.value || {}));
const checklistSummary = computed(() => buildChecklistSummary({
  employees: staffChecks.value,
  materials: materialChecks.value,
}));
const adjustmentEditable = computed(() => canEditAdjustmentActions(order.value || {}));
const adjustmentModalVisible = ref(false);
const adjustmentMode = ref<'service' | 'material'>('service');
const editingAdjustmentId = ref(0);
const showServiceSuggestions = ref(false);
const selectableServices = ref<any[]>([]);
const selectableMaterials = ref<any[]>([]);
const adjustmentModes = [
  { label: '增项服务', value: 'service' },
  { label: '增补物料', value: 'material' },
];
const adjustmentForm = reactive({
  service_item_id: 0,
  service_name: '',
  material_id: 0,
  material_name: '',
  material_quantity: '1',
  adjust_amount: '',
  remark: '',
});
const materialOptions = computed(() => selectableMaterials.value.map((item) => item.name));
const filteredServiceSuggestions = computed(() => buildServiceSuggestionList(selectableServices.value, adjustmentForm.service_name));
const isEditingAdjustment = computed(() => editingAdjustmentId.value > 0);

onLoad((opts: any) => { id.value = +opts.id; });

const syncChecklistState = () => {
  staffChecks.value = employees.value.map((item: any) => ({
    ...item,
    arrived: !!item?.arrived_at,
  }));
  materialChecks.value = plannedMaterials.value.map((item: any) => ({
    ...item,
    checked: Number(item?.checked || 0) === 1 ? 1 : 0,
  }));
  staffCheckRemark.value = String(order.value?.staff_check_remark || '').trim();
  materialCheckRemark.value = String(order.value?.material_check_remark || '').trim();
};

const loadDetail = async () => {
  if (!id.value) return;
  detail.value = await api.leaderOrderDetail(id.value);
  syncChecklistState();
};

onShow(async () => { await loadDetail(); });

const signIn = async () => {
  await api.signIn(id.value);
  uni.showToast({ title: '签到成功' });
  await loadDetail();
  setTimeout(() => {
    uni.navigateTo({ url: `/pages/leader/photo?id=${id.value}` });
  }, 400);
};
const goPhoto = () => uni.navigateTo({ url: `/pages/leader/photo?id=${id.value}` });
const goAcceptance = () => uni.navigateTo({ url: `/pages/leader/acceptance?id=${id.value}` });
const goBack = () => {
  const stackSize = typeof getCurrentPages === 'function' ? getCurrentPages().length : 1;
  runBackAction(getLeaderOrderBackAction(stackSize));
};

const formatAmount = (value: any) => Number(value || 0).toFixed(2);
const formatDateTime = (value: any) => {
  if (!value) return '刚刚';
  return new Date(value).toLocaleString();
};
const isStaffArrived = (item: any) => item?.arrived === true || !!item?.arrived_at;
const isMaterialChecked = (item: any) => Number(item?.checked || 0) === 1 || item?.checked === true;
const setStaffArrived = (rowId: number, arrived: boolean) => {
  if (!checklistEditable.value) return;
  staffChecks.value = staffChecks.value.map((item: any) => (
    item.id === rowId ? { ...item, arrived } : item
  ));
};
const setMaterialChecked = (rowId: number, checked: boolean) => {
  if (!checklistEditable.value) return;
  materialChecks.value = materialChecks.value.map((item: any) => (
    item.id === rowId ? { ...item, checked: checked ? 1 : 0 } : item
  ));
};
const submitStaffChecklist = async () => {
  await api.confirmLeaderStaff(id.value, buildStaffConfirmPayload({
    employees: staffChecks.value,
    remark: staffCheckRemark.value,
  }));
  uni.showToast({ title: '人员确认已保存', icon: 'success' });
  await loadDetail();
};
const submitMaterialChecklist = async () => {
  await api.confirmLeaderMaterials(id.value, buildMaterialConfirmPayload({
    materials: materialChecks.value,
    remark: materialCheckRemark.value,
  }));
  uni.showToast({ title: '物料清点已保存', icon: 'success' });
  await loadDetail();
};
const getAdjustmentTypeText = (type: number) => ({ 1: '服务增项', 2: '调价', 3: '增补物料' } as any)[type] || '临时增项';
const getAdjustmentTitle = (item: any) => item.service_name || item.material_name || '临时增项';
const resetAdjustmentForm = () => {
  editingAdjustmentId.value = 0;
  adjustmentForm.service_item_id = 0;
  adjustmentForm.service_name = '';
  adjustmentForm.material_id = 0;
  adjustmentForm.material_name = '';
  adjustmentForm.material_quantity = '1';
  adjustmentForm.adjust_amount = '';
  adjustmentForm.remark = '';
  showServiceSuggestions.value = false;
};
const normalizeList = (payload: any) => Array.isArray(payload) ? payload : payload?.list || [];
const loadAdjustmentResources = async () => {
  if (!selectableServices.value.length) {
    selectableServices.value = normalizeList(await api.leaderServices());
  }
  if (!selectableMaterials.value.length) {
    selectableMaterials.value = normalizeList(await api.leaderMaterials());
  }
};
const switchAdjustmentMode = (mode: 'service' | 'material') => {
  if (isEditingAdjustment.value) return;
  adjustmentMode.value = mode;
  resetAdjustmentForm();
};
const addExtra = async () => {
  await loadAdjustmentResources();
  editingAdjustmentId.value = 0;
  switchAdjustmentMode('service');
  adjustmentModalVisible.value = true;
};
const closeAdjustmentModal = () => {
  adjustmentModalVisible.value = false;
  resetAdjustmentForm();
};
const editAdjustment = async (item: any) => {
  await loadAdjustmentResources();
  const draft = buildAdjustmentEditDraft(item);
  editingAdjustmentId.value = Number(item?.id || 0);
  adjustmentMode.value = draft.mode;
  adjustmentForm.service_item_id = draft.form.service_item_id;
  adjustmentForm.service_name = draft.form.service_name;
  adjustmentForm.material_id = draft.form.material_id;
  adjustmentForm.material_name = draft.form.material_name;
  adjustmentForm.material_quantity = draft.form.material_quantity;
  adjustmentForm.adjust_amount = draft.form.adjust_amount;
  adjustmentForm.remark = draft.form.remark;
  adjustmentModalVisible.value = true;
};
const openServiceSuggestions = () => {
  showServiceSuggestions.value = true;
};
const onServiceNameInput = (event: any) => {
  adjustmentForm.service_name = event.detail.value;
  adjustmentForm.service_item_id = syncSelectedServiceId(
    selectableServices.value,
    adjustmentForm.service_item_id,
    adjustmentForm.service_name,
  );
  showServiceSuggestions.value = true;
};
const selectSuggestedService = (selected: any) => {
  if (!selected) return;
  adjustmentForm.service_item_id = selected.id;
  adjustmentForm.service_name = selected.name;
  adjustmentForm.adjust_amount = String(selected.price || selected.promo_price || 0);
  showServiceSuggestions.value = false;
};
const onMaterialPick = (event: any) => {
  const selected = selectableMaterials.value[Number(event.detail.value)];
  if (!selected) return;
  adjustmentForm.material_id = selected.id;
  adjustmentForm.material_name = selected.name;
};
const confirmEditAdjustment = (payload: any) => new Promise<void>((resolve, reject) => {
  uni.showModal({
    title: '确认修改',
    content: '确认保存当前增项修改吗？',
    success: async (res) => {
      if (!res.confirm) {
        resolve();
        return;
      }
      try {
        await api.updateAdjustment(id.value, editingAdjustmentId.value, payload);
        uni.showToast({ title: '已修改', icon: 'success' });
        closeAdjustmentModal();
        await loadDetail();
        resolve();
      } catch (error) {
        reject(error);
      }
    },
    fail: reject,
  });
});
const removeAdjustment = (item: any) => {
  uni.showModal({
    title: '确认删除',
    content: '删除后将同步回退尾款金额，确认继续吗？',
    success: async (res) => {
      if (!res.confirm) return;
      await api.deleteAdjustment(id.value, item.id);
      uni.showToast({ title: '已删除', icon: 'success' });
      await loadDetail();
    },
  });
};
const submitAdjustment = async () => {
  const amount = Number(adjustmentForm.adjust_amount || 0);
  if (Number.isNaN(amount) || amount < 0) {
    uni.showToast({ title: '请输入合法金额', icon: 'none' });
    return;
  }

  let payload: any = {
    adjust_amount: amount,
    remark: adjustmentForm.remark?.trim() || '',
  };

  if (adjustmentMode.value === 'service') {
    if (!adjustmentForm.service_name.trim()) {
      uni.showToast({ title: '请输入服务名称', icon: 'none' });
      return;
    }
    payload = buildServiceAdjustmentPayload({
      serviceItemId: adjustmentForm.service_item_id,
      serviceName: adjustmentForm.service_name,
      adjustAmount: adjustmentForm.adjust_amount,
      remark: adjustmentForm.remark,
    });
  } else {
    const quantity = Number(adjustmentForm.material_quantity || 0);
    if (!adjustmentForm.material_id) {
      uni.showToast({ title: '请选择物料', icon: 'none' });
      return;
    }
    if (!quantity || quantity <= 0) {
      uni.showToast({ title: '请输入合法数量', icon: 'none' });
      return;
    }
    payload = buildMaterialAdjustmentPayload({
      materialId: adjustmentForm.material_id,
      materialQuantity: quantity,
      adjustAmount: adjustmentForm.adjust_amount,
      remark: adjustmentForm.remark,
    });
  }

  if (isEditingAdjustment.value) {
    await confirmEditAdjustment(payload);
    return;
  }

  await api.addAdjustment(id.value, payload);
  uni.showToast({ title: '已添加' });
  closeAdjustmentModal();
  await loadDetail();
};
</script>

<style lang="scss" scoped>
@use '../../styles/common.scss' as *;

.page {
  min-height: 100vh;
  background: $bg-cream;
  padding-top: 8rpx;
}

.card {
  background: $bg-paper;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin: 20rpx 24rpx;
  box-shadow: $shadow-card;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-dark;
  margin-bottom: 16rpx;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid $line-light;
}

.info-row:last-child {
  border-bottom: 0;
}

.info-row.is-top {
  align-items: flex-start;
}

.label {
  flex-shrink: 0;
  width: 140rpx;
  font-size: 26rpx;
  color: $text-light;
}

.value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: $text-dark;
}

.value.multi {
  line-height: 1.5;
}

.primary {
  color: $color-primary;
}

.summary-box {
  background: $bg-grey;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.summary-label {
  font-size: 24rpx;
  color: $text-light;
}

.summary-value {
  font-size: 28rpx;
  font-weight: 700;
  color: $color-primary;
}

.plan-table {
  border: 1rpx solid $line-color;
  border-radius: 16rpx;
  overflow: hidden;
}

.plan-head,
.plan-row {
  display: flex;
  gap: 16rpx;
  padding: 18rpx 20rpx;
}

.plan-head {
  background: $bg-grey;
  font-size: 24rpx;
  color: $text-light;
  font-weight: 600;
}

.plan-row {
  font-size: 26rpx;
  color: $text-body;
  border-top: 1rpx solid $line-light;
}

.col-area {
  width: 140rpx;
  flex-shrink: 0;
}

.col-hours {
  width: 140rpx;
  flex-shrink: 0;
}

.col-content {
  flex: 1;
  line-height: 1.5;
}

.badge {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.badge-leader {
  background: $bg-sand2;
  color: $color-primary;
}

.badge-member {
  background: $bg-grey;
  color: $text-light;
}

.check-item + .check-item {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $line-light;
}

.check-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.check-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.check-name {
  font-size: 28rpx;
  color: $text-dark;
  font-weight: 600;
}

.check-qty {
  font-size: 26rpx;
  color: $text-light;
}

.check-status {
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 600;
}

.check-status.is-ok {
  color: $color-success-deep;
}

.check-status.is-missing {
  color: $color-warning-strong;
}

.check-time {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $text-light;
}

.check-action-group {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.check-action {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 14rpx;
  font-size: 26rpx;
  color: $text-body;
  background: $bg-grey;
  border: 1rpx solid $line-color;
}

.check-action.active {
  color: $color-white;
  background: $color-primary;
  border-color: $color-primary;
}

.check-action.danger.active {
  background: $color-warning-strong;
  border-color: $color-warning-strong;
}

.checklist-summary {
  margin-top: 20rpx;
}

.btn-inline {
  margin-top: 20rpx;
  margin-bottom: 0;
}

.empty-text {
  padding: 28rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: $text-light;
}

.adjustment-item + .adjustment-item {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $line-light;
}

.adjustment-head {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.adjustment-title {
  flex: 1;
  font-size: 28rpx;
  color: $text-dark;
  font-weight: 600;
}

.adjustment-amount {
  flex-shrink: 0;
  font-size: 28rpx;
  color: $color-primary;
  font-weight: 700;
}

.adjustment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 20rpx;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $text-light;
}

.adjustment-desc {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: $text-body;
  line-height: 1.5;
}

.adjustment-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 18rpx;
}

.adjustment-action {
  min-width: 120rpx;
  text-align: center;
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: $color-primary;
  background: $bg-primary-ghost;
}

.adjustment-action.danger {
  color: $color-warning-strong;
  background: $bg-warning-ghost;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: $overlay-dark-42;
  display: flex;
  align-items: flex-end;
  z-index: 99;
}

.modal-card {
  width: 100%;
  background: $bg-paper;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-dark;
}

.modal-close {
  font-size: 40rpx;
  color: $text-light;
  line-height: 1;
}

.mode-tabs {
  display: flex;
  gap: 16rpx;
  margin: 24rpx 0;
}

.mode-tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 12rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: $text-light;
  background: $bg-grey;
}

.mode-tab.active {
  color: $color-white;
  background: $color-primary;
}

.autocomplete-box {
  position: relative;
}

.suggestion-panel {
  margin-top: 8rpx;
  border-radius: 16rpx;
  background: $bg-paper;
  border: 1rpx solid $line-color;
  box-shadow: $shadow-card;
  max-height: 480rpx;
  height: 480rpx;
  overflow: hidden;
}

.suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: $text-body;
}

.suggestion-item + .suggestion-item {
  border-top: 1rpx solid $line-light;
}

.suggestion-price {
  color: $color-primary;
  font-weight: 600;
}

.form-block + .form-block {
  margin-top: 20rpx;
}

.field-label {
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: $text-body;
}

.mt-12 {
  margin-top: 12rpx;
}

.picker-field,
.input-field,
.textarea-field {
  width: 100%;
  box-sizing: border-box;
  border-radius: 16rpx;
  background: $bg-grey;
  border: 1rpx solid $line-color;
  color: $text-dark;
}

.picker-field,
.input-field {
  min-height: 88rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
}

.textarea-field {
  min-height: 160rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
}

.modal-btn {
  flex: 1;
  text-align: center;
  border-radius: 16rpx;
  padding: 22rpx 0;
  font-size: 30rpx;
}

.btn-cancel {
  color: $text-body;
  background: $bg-grey;
}

.btn-confirm {
  color: $color-white;
  background: $color-primary;
}

.footer {
  padding: 12rpx 24rpx 24rpx;
}

.btn-primary {
  background: $color-primary;
  color: $color-white;
  padding: 24rpx;
  border-radius: 12rpx;
  text-align: center;
  font-size: 30rpx;
  margin-bottom: 16rpx;
}

.btn-default {
  background: $bg-paper;
  color: $color-primary;
  border: 2rpx solid $color-primary;
  padding: 22rpx;
  border-radius: 12rpx;
  text-align: center;
  font-size: 30rpx;
  margin-bottom: 16rpx;
}
</style>

