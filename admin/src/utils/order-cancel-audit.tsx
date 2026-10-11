import { Input, Modal, message } from 'antd';
import React from 'react';
import request from './request';

type CancelAuditParams = {
  orderId: number;
  approved: boolean;
  onSuccess?: () => void | Promise<void>;
};

export function openCancelAuditModal({ orderId, approved, onSuccess }: CancelAuditParams) {
  const remarkInputId = `cancel-audit-remark-${orderId}-${approved ? 'approve' : 'reject'}`;
  const title = approved ? '同意取消并退款' : '拒绝取消';
  const placeholder = approved ? '请输入审核备注，可选' : '请输入拒绝原因，便于回溯';
  const successText = approved ? '已同意取消并完成退款' : '已拒绝取消申请';

  Modal.confirm({
    title,
    content: (
      <Input.TextArea
        id={remarkInputId}
        rows={4}
        placeholder={placeholder}
      />
    ),
    onOk: async () => {
      const remark = (document.getElementById(remarkInputId) as HTMLTextAreaElement | null)?.value?.trim() || '';
      await request.post(`/admin/orders/${orderId}/cancel/audit`, {
        approved,
        remark,
      });
      message.success(successText);
      await onSuccess?.();
    },
  });
}
