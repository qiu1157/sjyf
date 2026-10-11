import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message } from 'antd';
import request from '../utils/request';

const fmtTime = (t?: string | null) => (t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-');

export default function Leaders() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 20 });
  const [editing, setEditing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = () => request.get('/admin/leaders', { params: filters }).then(setData);
  useEffect(() => { load(); }, [filters]);

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      phone: record.phone,
      remark: record.remark,
    });
    setModalOpen(true);
  };

  const submitEdit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await request.put(`/admin/leaders/${editing.id}`, values);
      message.success('领队档案已更新');
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (record: any) => {
    const actionText = record.status === 1 ? '禁用' : '启用';
    Modal.confirm({
      title: `确认${actionText}领队「${record.name}」吗？`,
      content: record.status === 1 ? '禁用后将不可登录领队工作台，且不可被分配新订单。' : '启用后将恢复工作台登录与新订单分配能力。',
      okText: `确认${actionText}`,
      cancelText: '取消',
      onOk: async () => {
        await request.put(`/admin/leaders/${record.id}/status`);
        message.success(`领队已${actionText}`);
        load();
      },
    });
  };

  const cancelLeader = (record: any) => {
    Modal.confirm({
      title: `确认取消「${record.name}」的领队身份吗？`,
      content: '取消后该档案会从人员管理有效领队列表移除；若存在进行中订单，系统会阻止本次操作。',
      okText: '确认取消',
      cancelText: '取消',
      onOk: async () => {
        if (!record.user_id) {
          message.error('该领队未关联微信用户，无法取消领队身份');
          return;
        }
        await request.post(`/admin/users/${record.user_id}/cancel-leader`);
        message.success('已取消领队身份');
        load();
      },
    });
  };

  return (
    <Card title="人员管理">
      <Space style={{ marginBottom: 16 }} size="middle">
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
        rowKey="id"
        dataSource={data.list}
        pagination={{
          current: filters.page,
          total: data.total,
          pageSize: filters.pageSize,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setFilters({ ...filters, page, pageSize }),
        }}
        columns={[
          { title: '姓名', dataIndex: 'name', width: 120 },
          { title: '手机号', dataIndex: 'phone', width: 140 },
          { title: '微信昵称', dataIndex: 'wx_nickname', render: (value: string) => value || '-' },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (value: number) => (value === 1 ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>),
          },
          { title: '备注', dataIndex: 'remark', render: (value: string) => value || '-' },
          { title: '关联订单数', dataIndex: 'order_count', width: 110 },
          { title: '创建时间', dataIndex: 'created_at', width: 180, render: fmtTime },
          {
            title: '操作',
            width: 240,
            render: (_, record: any) => (
              <Space size="small">
                <Button type="link" size="small" onClick={() => openEdit(record)}>
                  编辑
                </Button>
                <Button type="link" size="small" onClick={() => toggleStatus(record)}>
                  {record.status === 1 ? '禁用' : '启用'}
                </Button>
                <Button type="link" size="small" danger onClick={() => cancelLeader(record)}>
                  取消领队身份
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title="编辑领队档案"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submitEdit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input maxLength={32} placeholder="请输入领队姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input maxLength={11} placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={512} placeholder="技能专长、所属区域等（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
