import { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Button, Space, Modal, Form, Select, InputNumber, Input, message, Table, Image, Empty, Timeline, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { openCancelAuditModal } from '../utils/order-cancel-audit';
import {
  buildAdjustmentTraceRows,
  buildHistoryTimelineItems,
  groupPhotosBySpace,
} from './order-detail-trace-utils.mjs';
import {
  buildBookTimeOptions,
  buildOrderPlanPayload,
  buildPlanFormInitialValues,
} from './order-plan-utils.mjs';

const STATUS: Record<number, { text: string; color: string }> = {
  10: { text: '待支付', color: 'default' },
  20: { text: '待接单', color: 'orange' },
  30: { text: '待上门', color: 'blue' },
  40: { text: '服务中', color: 'processing' },
  60: { text: '待付尾款', color: 'gold' },
  80: { text: '已完成', color: 'success' },
  91: { text: '待取消', color: 'warning' },
  90: { text: '已取消', color: 'error' },
};

const PLAN_AREAS = [
  { key: 'entrance', name: '玄关' },
  { key: 'living_room', name: '客厅' },
  { key: 'kitchen', name: '厨房' },
  { key: 'master_wardrobe', name: '主卧衣柜' },
  { key: 'second_room', name: '次卧/儿童房' },
  { key: 'bathroom', name: '卫生间' },
  { key: 'other', name: '其他区域' },
];

function parseAddressSnapshot(snapshot?: string) {
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
}

function getServiceAddress(addressSnapshot: any) {
  if (!addressSnapshot) return '-';
  return addressSnapshot.full_address
    || addressSnapshot.service_address
    || [addressSnapshot.province, addressSnapshot.city, addressSnapshot.district, addressSnapshot.detail]
      .filter(Boolean)
      .join('')
    || '-';
}

function parseServicePlanDetail(rawDetail: any) {
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

function calculateTotalPlanHours(areas: any[] = []) {
  const total = areas.reduce((sum, item) => sum + Number(item?.plan_hours || 0), 0);
  return Number(total.toFixed(1));
}

function getDisplayHours(value: any) {
  return Number(Number(value || 0).toFixed(1));
}

function buildActualHourSummary(order: any) {
  const planHours = getDisplayHours(order?.plan_hours);
  const planActualHours = getDisplayHours(order?.plan_actual_hours);
  const extraActualHours = getDisplayHours(order?.extra_actual_hours);
  const actualHours = getDisplayHours(order?.actual_hours);
  const diffHours = Number((actualHours - planHours).toFixed(1));

  return {
    planHours,
    planActualHours,
    extraActualHours,
    actualHours,
    diffHours,
  };
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [histories, setHistories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [planModal, setPlanModal] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [form] = Form.useForm();
  const watchedAreas = Form.useWatch('areas', form) || [];
  const watchedMaterialList = Form.useWatch('material_list', form) || [];

  const load = () => {
    Promise.all([
      request.get(`/admin/orders/${id}`),
      request.get(`/admin/orders/${id}/histories`),
    ]).then(([detailResult, historyResult]) => {
      setDetail(detailResult);
      setHistories(Array.isArray(historyResult) ? historyResult : []);
    });
  };

  useEffect(() => {
    load();
    request.get('/admin/employees', { params: { pageSize: 100 } }).then((d: any) => setEmployees(d.list));
    request.get('/admin/materials', { params: { pageSize: 100 } }).then((d: any) => setMaterials(d.list));
  }, [id]);

  useEffect(() => {
    if (!planModal || !detail) return;

    const { order, employees: orderEmps, materials: orderMats } = detail;
    const initialValues = buildPlanFormInitialValues({
      order,
      employees: orderEmps,
      materials: orderMats,
      planAreas: PLAN_AREAS,
    });
    form.setFieldsValue({
      ...initialValues,
      book_date: initialValues.book_date ? dayjs(initialValues.book_date, 'YYYY-MM-DD') : undefined,
    });
  }, [detail, form, planModal]);

  if (!detail) return null;
  const { order, employees: orderEmps, materials: orderMats, photos, adjustments } = detail;
  const addressSnapshot = parseAddressSnapshot(order.address_snapshot);
  const serviceAddress = getServiceAddress(addressSnapshot);
  const parsedPlanDetail = parseServicePlanDetail(order.service_plan_detail);
  const totalPlanHours = calculateTotalPlanHours(watchedAreas);
  const actualHourSummary = buildActualHourSummary(order);
  const adjustmentTraceRows = buildAdjustmentTraceRows(adjustments || []);
  const historyTimelineItems = buildHistoryTimelineItems({ order, histories: histories || [] });
  const groupedPhotos = groupPhotosBySpace(photos || []);
  const isPendingAccept = Number(order.status) === 20;
  const bookTimeOptions = buildBookTimeOptions(order.book_time);

  const submitPlan = async () => {
    const v = await form.validateFields();
    const payload = buildOrderPlanPayload({
      orderStatus: order.status,
      values: {
        ...v,
        book_date: v.book_date ? v.book_date.format('YYYY-MM-DD') : undefined,
      },
      planAreas: PLAN_AREAS,
    });
    await request.post(`/admin/orders/${id}/plan`, payload);
    message.success(order.status === 20 ? '方案已制定并接单' : '方案已更新');
    setPlanModal(false);
    load();
  };

  const openMaterialPicker = () => {
    setSelectedMaterialIds([]);
    setMaterialPickerOpen(true);
  };

  const confirmMaterialPicker = () => {
    const currentList = Array.isArray(watchedMaterialList) ? watchedMaterialList : [];
    const existingIds = new Set(
      currentList
        .map((item: any) => item?.material_id)
        .filter(Boolean),
    );

    const nextList = [
      ...currentList,
      ...selectedMaterialIds
        .filter((materialId) => !existingIds.has(materialId))
        .map((materialId) => ({
          material_id: materialId,
          quantity: 1,
        })),
    ];

    form.setFieldsValue({ material_list: nextList });
    setMaterialPickerOpen(false);
    setSelectedMaterialIds([]);
  };

  const cancel = () => {
    Modal.confirm({
      title: '取消订单',
      content: (
        <Input.TextArea id="cancel-reason" placeholder="取消原因" rows={3} />
      ),
      onOk: async () => {
        const reason = (document.getElementById('cancel-reason') as HTMLInputElement)?.value || '管理员取消';
        await request.post(`/admin/orders/${id}/cancel`, { reason });
        message.success('订单已取消');
        load();
      },
    });
  };

  return (
    <div>
      <Card
        title={`订单详情 ${order.order_no}`}
        extra={
          <Space>
            <Button onClick={() => navigate(-1)}>返回</Button>
            {(order.status === 20 || order.status === 30) && (
              <Button type="primary" onClick={() => setPlanModal(true)}>
                {isPendingAccept ? '制定方案并接单' : '制定/调整方案'}
              </Button>
            )}
            {order.status === 91 && (
              <>
                <Button
                  type="primary"
                  onClick={() => openCancelAuditModal({ orderId: order.id, approved: true, onSuccess: load })}
                >
                  同意取消并退款
                </Button>
                <Button
                  danger
                  onClick={() => openCancelAuditModal({ orderId: order.id, approved: false, onSuccess: load })}
                >
                  拒绝取消
                </Button>
              </>
            )}
            {order.status < 40 && order.status !== 90 && order.status !== 91 && <Button danger onClick={cancel}>取消订单</Button>}
          </Space>
        }
      >
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="状态">
            <Tag color={STATUS[order.status]?.color || 'default'}>{STATUS[order.status]?.text || `状态${order.status}`}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{new Date(order.created_at).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="服务">{order.service_name}</Descriptions.Item>
          <Descriptions.Item label="价格">¥{order.service_price}</Descriptions.Item>
          <Descriptions.Item label="预约">{order.book_date} {order.book_time}</Descriptions.Item>
          <Descriptions.Item label="总金额">¥{order.total_amount}</Descriptions.Item>
          <Descriptions.Item label="首付款">¥{order.first_payment} {order.first_pay_time ? '✅' : '❌'}</Descriptions.Item>
          <Descriptions.Item label="尾款">¥{order.final_payment} {order.final_pay_time ? '✅' : '❌'}</Descriptions.Item>
          <Descriptions.Item label="用户备注" span={2}>{order.user_remark || '-'}</Descriptions.Item>
          <Descriptions.Item label="计划工时">{actualHourSummary.planHours} 小时</Descriptions.Item>
          <Descriptions.Item label="实际方案工时">{actualHourSummary.planActualHours} 小时</Descriptions.Item>
          <Descriptions.Item label="增项工时">{actualHourSummary.extraActualHours} 小时</Descriptions.Item>
          <Descriptions.Item label="实际总工时">{actualHourSummary.actualHours} 小时</Descriptions.Item>
          <Descriptions.Item label="工时差异" span={2}>
            <span style={{ color: actualHourSummary.diffHours > 0 ? '#f5222d' : actualHourSummary.diffHours < 0 ? '#52c41a' : undefined }}>
              {actualHourSummary.diffHours > 0 ? '+' : ''}
              {actualHourSummary.diffHours.toFixed(1)} 小时
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="客户信息" style={{ marginTop: 16 }}>
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="联系人">{addressSnapshot?.contact_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{addressSnapshot?.contact_phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="服务地址" span={2}>{serviceAddress}</Descriptions.Item>
        </Descriptions>
      </Card>

      {(order.status === 91 || order.cancel_apply_time || order.cancel_reason) && (
        <Card title="取消申请信息" style={{ marginTop: 16 }}>
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label="申请时间">
              {order.cancel_apply_time ? new Date(order.cancel_apply_time).toLocaleString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="原状态">
              {STATUS[order.prev_status]?.text || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="取消原因" span={2}>
              {order.cancel_reason || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="审核时间">
              {order.cancel_audit_time ? new Date(order.cancel_audit_time).toLocaleString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="审核备注">
              {order.cancel_audit_remark || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card title="区域方案" style={{ marginTop: 16 }}>
        <Descriptions bordered column={2} size="small" style={{ marginBottom: 12 }}>
          <Descriptions.Item label="领队">
            {orderEmps.find((item: any) => item.is_leader === 1)?.employee?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="计划工时汇总">{order.plan_hours || 0} 小时</Descriptions.Item>
        </Descriptions>
        {parsedPlanDetail.areas.length ? (
          <Table
            rowKey="area_key"
            pagination={false}
            size="small"
            dataSource={parsedPlanDetail.areas}
            columns={[
              { title: '区域', dataIndex: 'area_name', width: 140 },
              { title: '计划工时', dataIndex: 'plan_hours', width: 120, render: (value: number) => `${value || 0} 小时` },
              { title: '方案内容', dataIndex: 'plan_content', render: (value: string) => value || '-' },
            ]}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂未制定区域方案" />
        )}
      </Card>

      <Card title="服务人员" style={{ marginTop: 16 }}>
        <Table
          rowKey="id" pagination={false}
          dataSource={orderEmps}
          columns={[
            { title: '姓名', render: (r) => r.employee?.name },
            { title: '电话', render: (r) => r.employee?.phone },
            { title: '是否领队', dataIndex: 'is_leader', render: (v: number) => v ? <Tag color="gold">领队</Tag> : '员工' },
          ]}
        />
      </Card>

      <Card title="物料清单" style={{ marginTop: 16 }}>
        <Table
          rowKey="id" pagination={false}
          dataSource={orderMats.filter((item: any) => item.is_extra !== 1)}
          columns={[
            { title: '物料', dataIndex: 'material_name' },
            { title: '数量', dataIndex: 'quantity' },
          ]}
        />
      </Card>

      <Card title="临时增项记录" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无临时增项记录' }}
          dataSource={adjustmentTraceRows}
          columns={[
            {
              title: '内容',
              dataIndex: 'content_text',
            },
            {
              title: '类型',
              dataIndex: 'adjust_type_text',
              width: 120,
            },
            {
              title: '金额',
              dataIndex: 'amount_text',
              width: 120,
            },
            {
              title: '操作人',
              dataIndex: 'operator_name',
              width: 120,
            },
            {
              title: '操作时间',
              dataIndex: 'created_at',
              width: 200,
              render: (value: string) => (value ? new Date(value).toLocaleString() : '-'),
            },
            {
              title: '备注',
              dataIndex: 'remark',
              render: (value: string) => value || '-',
            },
          ]}
        />
      </Card>

      <Card title="订单历史" style={{ marginTop: 16 }}>
        {historyTimelineItems.length ? (
          <Timeline
            items={historyTimelineItems.map((item) => ({
              key: item.id,
              children: (
                <Space direction="vertical" size={2}>
                  <strong>{item.title}</strong>
                  <span>{item.content_text}</span>
                  <span style={{ color: '#8c8c8c' }}>
                    {item.operator_name} · {item.time ? new Date(item.time).toLocaleString() : '-'}
                  </span>
                  {item.remark ? <span style={{ color: '#8c8c8c' }}>备注：{item.remark}</span> : null}
                </Space>
              ),
            }))}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无订单历史" />
        )}
      </Card>

      <Card title="服务照片" style={{ marginTop: 16 }}>
        {groupedPhotos.length ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {groupedPhotos.map((group: any) => (
              <Card key={group.space_name} size="small" title={group.space_name}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>服务前</div>
                    {group.before.length ? (
                      <Image.PreviewGroup>
                        {group.before.map((photo: any) => (
                          <Image
                            key={photo.id}
                            src={photo.photo_url || photo.url}
                            width={120}
                            style={{ marginRight: 8, marginBottom: 8 }}
                          />
                        ))}
                      </Image.PreviewGroup>
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无服务前照片" />
                    )}
                  </div>
                  <div>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>服务后</div>
                    {group.after.length ? (
                      <Image.PreviewGroup>
                        {group.after.map((photo: any) => (
                          <Image
                            key={photo.id}
                            src={photo.photo_url || photo.url}
                            width={120}
                            style={{ marginRight: 8, marginBottom: 8 }}
                          />
                        ))}
                      </Image.PreviewGroup>
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无服务后照片" />
                    )}
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无服务照片" />
        )}
      </Card>

      <Modal
        title={isPendingAccept ? '制定方案并接单' : '制定服务方案'} open={planModal}
        onCancel={() => setPlanModal(false)}
        onOk={submitPlan}
        width={960}
        maskClosable={false}
        keyboard={false}
      >
        <Form form={form} layout="vertical">
          <Card size="small" title="客户信息" style={{ marginBottom: 16 }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="联系人">{addressSnapshot?.contact_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{addressSnapshot?.contact_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="服务地址">{serviceAddress}</Descriptions.Item>
            </Descriptions>
          </Card>
          {isPendingAccept && (
            <Card size="small" title="预约信息" style={{ marginBottom: 16 }}>
              <Space style={{ width: '100%' }} size={16} align="start">
                <Form.Item
                  name="book_date"
                  label="预约日期"
                  rules={[{ required: true, message: '请选择预约日期' }]}
                  style={{ marginBottom: 0, minWidth: 220 }}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    disabledDate={(current) => !!current && current.endOf('day').isBefore(dayjs().startOf('day'))}
                  />
                </Form.Item>
                <Form.Item
                  name="book_time"
                  label="预约时段"
                  rules={[{ required: true, message: '请选择预约时段' }]}
                  style={{ marginBottom: 0, minWidth: 220 }}
                >
                  <Select placeholder="选择预约时段" options={bookTimeOptions} />
                </Form.Item>
              </Space>
            </Card>
          )}
          <Form.Item name="leader_id" label="领队" rules={[{ required: true }]}>
            <Select
              placeholder="选择领队"
              options={employees
                .filter((e) => e.role === 4 && e.status === 1 && e.is_leader_active === 1)
                .map((e) => ({ value: e.id, label: e.name }))}
            />
          </Form.Item>
          <Form.Item name="employee_ids" label="服务人员" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="选择服务人员"
              options={employees
                .filter((e) => e.status === 1 && ((e.role === 4 && e.is_leader_active === 1) || e.role === 5))
                .map((e) => ({ value: e.id, label: `${e.name}（${e.role === 4 ? '领队' : '员工'}）` }))}
            />
          </Form.Item>
          <Card size="small" title="区域方案" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="计划工时汇总">{totalPlanHours} 小时</Descriptions.Item>
              </Descriptions>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={PLAN_AREAS}
                columns={[
                  {
                    title: '区域',
                    dataIndex: 'name',
                    width: 140,
                  },
                  {
                    title: '计划工时',
                    width: 160,
                    render: (_, area, index) => (
                      <>
                        <Form.Item name={['areas', index, 'area_key']} hidden>
                          <Input />
                        </Form.Item>
                        <Form.Item name={['areas', index, 'area_name']} hidden>
                          <Input />
                        </Form.Item>
                        <Form.Item
                          name={['areas', index, 'plan_hours']}
                          rules={[{ required: true, message: `请输入${area.name}计划工时` }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    title: '方案内容',
                    render: (_, area, index) => (
                      <Form.Item
                        name={['areas', index, 'plan_content']}
                        style={{ marginBottom: 0 }}
                      >
                        <Input.TextArea
                          placeholder={`请输入${area.name}的服务方案`}
                          maxLength={500}
                          showCount
                          autoSize={{ minRows: 2, maxRows: 3 }}
                        />
                      </Form.Item>
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
          <Form.List name="material_list">
            {(fields, { remove }) => (
              <Card
                size="small"
                title="物料清单"
                extra={<Button type="link" onClick={openMaterialPicker}>新增物料</Button>}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {!!fields.length && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(260px, 1fr) 120px 64px',
                        gap: 12,
                        fontSize: 12,
                        color: 'rgba(0,0,0,0.45)',
                        padding: '0 4px',
                      }}
                    >
                      <span>物料</span>
                      <span>数量</span>
                      <span>操作</span>
                    </div>
                  )}
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(260px, 1fr) 120px 64px',
                        gap: 12,
                        alignItems: 'start',
                      }}
                    >
                      <Form.Item
                        {...field}
                        name={[field.name, 'material_id']}
                        rules={[{ required: true, message: '请选择物料' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          disabled
                          placeholder="选择物料"
                          options={materials
                            .filter((item) => item.status === 1)
                            .map((item) => ({ value: item.id, label: item.name }))}
                        />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'quantity']}
                        rules={[{ required: true, message: '请输入数量' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={1} precision={0} style={{ width: 120 }} />
                      </Form.Item>
                      <Button danger onClick={() => remove(field.name)}>删除</Button>
                    </div>
                  ))}
                  {!fields.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无原方案物料" />}
                </Space>
              </Card>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title="选择物料"
        open={materialPickerOpen}
        onCancel={() => {
          setMaterialPickerOpen(false);
          setSelectedMaterialIds([]);
        }}
        onOk={confirmMaterialPicker}
        width={720}
        maskClosable={false}
        keyboard={false}
      >
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={materials.filter((item) => item.status === 1)}
          rowSelection={{
            selectedRowKeys: selectedMaterialIds,
            onChange: (keys) => setSelectedMaterialIds(keys as number[]),
          }}
          columns={[
            { title: '物料名称', dataIndex: 'name' },
            { title: '分类', dataIndex: 'category', render: (value: string) => value || '-' },
            { title: '规格', dataIndex: 'specification', render: (value: string) => value || '-' },
            { title: '单位', dataIndex: 'unit', width: 100 },
          ]}
        />
      </Modal>
    </div>
  );
}
