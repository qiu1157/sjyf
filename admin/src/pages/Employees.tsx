import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message } from 'antd';
import request from '../utils/request';

// 人员管理仅维护领队与服务人员两种角色（后台账号由「账号管理」模块单独维护）
const ROLE: Record<number, string> = { 4: '领队', 5: '服务人员' };
const STAFF_ROLE = 5;
const fmtTime = (t?: string | null) => (t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-');

export default function Employees() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 20 });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = () => request.get('/admin/employees', { params: filters }).then(setData);
  useEffect(() => { load(); }, [filters]);

  const open = (row?: any) => {
    setEditing(row || null);
    form.resetFields();
    if (row) {
      form.setFieldsValue({
        name: row.name,
        phone: row.phone,
        remark: row.remark,
      });
    } else {
      form.setFieldsValue({ role: STAFF_ROLE });
    }
    setModal(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await request.put(`/admin/employees/${editing.id}`, v);
        message.success('人员信息已更新');
      } else {
        await request.post('/admin/employees', { ...v, role: STAFF_ROLE });
        message.success('服务人员已新增');
      }
      setModal(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: any) => {
    const actionText = row.status === 1 ? '禁用' : '启用';
    Modal.confirm({
      title: `确认${actionText}${ROLE[row.role]}「${row.name}」吗？`,
      content: row.role === 4
        ? (row.status === 1 ? '禁用后将不可登录领队工作台，且不可被分配新订单。' : '启用后将恢复工作台登录与新订单分配能力。')
        : (row.status === 1 ? '禁用后该服务人员将不可继续参与排班。' : '启用后该服务人员可继续参与排班。'),
      okText: `确认${actionText}`,
      cancelText: '取消',
      onOk: async () => {
        await request.put(`/admin/employees/${row.id}/status`, { status: row.status === 1 ? 0 : 1 });
        message.success(`${ROLE[row.role]}已${actionText}`);
        load();
      },
    });
  };

  const cancelLeader = (row: any) => {
    Modal.confirm({
      title: `确认取消「${row.name}」的领队身份吗？`,
      content: '取消后该档案会从有效领队列表移除；若存在进行中订单，系统会阻止本次操作。',
      okText: '确认取消',
      cancelText: '取消',
      onOk: async () => {
        if (!row.user_id) {
          message.error('该领队未关联微信用户，无法取消领队身份');
          return;
        }
        await request.post(`/admin/users/${row.user_id}/cancel-leader`);
        message.success('已取消领队身份');
        load();
      },
    });
  };

  return (
    <Card title="人员管理" extra={<Button type="primary" onClick={() => open()}>新增员工</Button>}>
      <Space style={{ marginBottom: 16 }} size="middle">
        <Select
          allowClear
          placeholder="角色"
          style={{ width: 140 }}
          value={filters.role}
          onChange={(value) => setFilters({ ...filters, role: value, page: 1 })}
          options={[
            { value: 4, label: '领队' },
            { value: 5, label: '服务人员' },
          ]}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 120 }}
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
          options={[
            { value: 1, label: '启用' },
            { value: 0, label: '禁用' },
          ]}
        />
        <Input.Search
          allowClear
          placeholder="姓名/手机号"
          style={{ width: 220 }}
          onSearch={(value) => setFilters({ ...filters, keyword: value || undefined, page: 1 })}
        />
      </Space>
      <Table
        rowKey="id" dataSource={data.list}
        pagination={{
          current: filters.page,
          total: data.total,
          pageSize: filters.pageSize,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (p, ps) => setFilters({ ...filters, page: p, pageSize: ps }),
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '姓名', dataIndex: 'name' },
          { title: '电话', dataIndex: 'phone' },
          { title: '微信昵称', dataIndex: 'wx_nickname', render: (value: string) => value || '-' },
          { title: '角色', dataIndex: 'role', render: (r: number) => <Tag color="blue">{ROLE[r]}</Tag> },
          { title: '状态', dataIndex: 'status', render: (s: number) => s === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag> },
          { title: '备注', dataIndex: 'remark', render: (value: string) => value || '-' },
          { title: '关联订单数', dataIndex: 'order_count', width: 110, render: (value: number, row: any) => (row.role === 4 ? value || 0 : '-') },
          { title: '创建时间', dataIndex: 'created_at', width: 180, render: fmtTime },
          {
            title: '操作',
            width: 260,
            render: (_, r) => (
              <Space>
                <Button size="small" type="link" onClick={() => open(r)}>编辑</Button>
                <Button size="small" type="link" onClick={() => toggle(r)}>{r.status === 1 ? '禁用' : '启用'}</Button>
                {r.role === 4 ? (
                  <Button size="small" type="link" danger onClick={() => cancelLeader(r)}>取消领队身份</Button>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? `编辑${ROLE[editing.role] || '人员'}` : '新增服务人员'}
        open={modal}
        onCancel={() => setModal(false)}
        onOk={submit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input maxLength={32} />
          </Form.Item>
          <Form.Item name="phone" label="电话" rules={[{ pattern: /^1\d{10}$/, message: '手机号格式不正确' }]}>
            <Input maxLength={11} />
          </Form.Item>
          {!editing ? (
            <Form.Item label="角色">
              <Input value="服务人员" disabled />
            </Form.Item>
          ) : null}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={512} placeholder="技能专长、所属区域等（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
