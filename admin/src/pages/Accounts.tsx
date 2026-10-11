import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message } from 'antd';
import request from '../utils/request';

// 后台账号角色映射（本期仅系统管理员/主管）
const ROLE: Record<number, string> = { 1: '系统管理员', 3: '主管' };

// 时间格式化：空值返回 '-'
const fmtTime = (t?: string | null) => (t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-');

export default function Accounts() {
  const adminUser = useMemo(() => JSON.parse(localStorage.getItem('admin_user') || '{}'), []);
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 20 });
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const load = () => request.get('/admin/accounts', { params: filters }).then(setData);
  useEffect(() => { load(); }, [filters]);

  const open = () => {
    form.resetFields();
    setEditingRecord(null);
    setEditMode('create');
    setModal(true);
  };

  const openEdit = (record: any) => {
    setEditingRecord(record);
    setEditMode('edit');
    form.setFieldsValue({
      username: record.username,
      name: record.name,
      phone: record.phone,
      role: record.role,
    });
    setModal(true);
  };

  const openResetPassword = (record: any) => {
    setEditingRecord(record);
    resetForm.resetFields();
    setResetModal(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    setLoading(true);
    try {
      if (editMode === 'create') {
        await request.post('/admin/accounts', v);
        // 主管账号默认无可见菜单，需提示前往菜单权限配置
        if (v.role === 3) {
          message.success('主管账号创建成功，需在「菜单权限配置」中为其配置可见菜单后才能正常使用');
        } else {
          message.success('账号创建成功');
        }
      } else {
        await request.put(`/admin/accounts/${editingRecord.id}`, {
          name: v.name,
          phone: v.phone,
        });
        message.success('账号信息已更新');
      }
      setModal(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const submitResetPassword = async () => {
    const v = await resetForm.validateFields();
    setLoading(true);
    try {
      await request.put(`/admin/accounts/${editingRecord.id}/password`, { newPassword: v.newPassword });
      message.success('密码已重置');
      setResetModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (record: any) => {
    const actionText = record.status === 1 ? '禁用' : '启用';
    const extraWarning = record.username === 'admin' && record.status === 1
      ? '这是超级管理员账号，请确认当前有其他可用管理员账号。'
      : undefined;
    Modal.confirm({
      title: `确认${actionText}账号「${record.username}」吗？`,
      content: extraWarning || `${actionText}后将${record.status === 1 ? '无法' : '可以重新'}登录后台。`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      onOk: async () => {
        await request.put(`/admin/accounts/${record.id}/status`);
        message.success(`账号已${actionText}`);
        load();
      },
    });
  };

  return (
    <Card title="账号管理" extra={<Button type="primary" onClick={open}>新增账号</Button>}>
      <Space style={{ marginBottom: 16 }} size="middle">
        <Select
          allowClear
          placeholder="角色"
          style={{ width: 140 }}
          value={filters.role}
          onChange={(v) => setFilters({ ...filters, role: v, page: 1 })}
          options={Object.entries(ROLE).map(([k, v]) => ({ value: +k, label: v }))}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 120 }}
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v, page: 1 })}
          options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]}
        />
        <Input.Search
          allowClear
          placeholder="账号/姓名/手机号"
          style={{ width: 220 }}
          onSearch={(v) => setFilters({ ...filters, keyword: v || undefined, page: 1 })}
        />
      </Space>
      <Table
        rowKey="id"
        dataSource={data.list}
        pagination={{
          current: filters.page,
          total: data.total,
          onChange: (p, ps) => setFilters({ ...filters, page: p, pageSize: ps }),
          showTotal: (t) => `共 ${t} 条`,
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '账号', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'name' },
          { title: '手机号', dataIndex: 'phone' },
          { title: '角色', dataIndex: 'role', render: (r: number) => <Tag color="blue">{ROLE[r]}</Tag> },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: number) => (s === 1 ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>),
          },
          { title: '创建时间', dataIndex: 'created_at', render: fmtTime, width: 180 },
          { title: '最近登录', dataIndex: 'last_login_time', render: fmtTime, width: 180 },
          {
            title: '操作',
            width: 240,
            render: (_, record: any) => (
              <Space size="small">
                <Button type="link" size="small" onClick={() => openEdit(record)}>
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger={record.status === 1}
                  disabled={record.id === adminUser.id}
                  onClick={() => handleToggle(record)}
                >
                  {record.status === 1 ? '禁用' : '启用'}
                </Button>
                <Button type="link" size="small" onClick={() => openResetPassword(record)}>
                  重置密码
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editMode === 'create' ? '新增账号' : '编辑账号'}
        open={modal}
        onCancel={() => setModal(false)}
        onOk={submit}
        confirmLoading={loading}
        okText={editMode === 'create' ? '创建' : '保存'}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入登录账号' }]}>
            <Input placeholder="用于后台登录" maxLength={64} disabled={editMode === 'edit'} />
          </Form.Item>
          {editMode === 'create' ? (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="请输入密码" maxLength={128} />
            </Form.Item>
          ) : null}
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" maxLength={32} />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          {editMode === 'create' ? (
            <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
              <Select
                placeholder="请选择角色"
                options={Object.entries(ROLE).map(([k, v]) => ({ value: +k, label: v }))}
              />
            </Form.Item>
          ) : (
            <Form.Item name="role" label="角色">
              <Select disabled options={Object.entries(ROLE).map(([k, v]) => ({ value: +k, label: v }))} />
            </Form.Item>
          )}
        </Form>
      </Modal>
      <Modal
        title={`重置密码${editingRecord ? ` · ${editingRecord.username}` : ''}`}
        open={resetModal}
        onCancel={() => setResetModal(false)}
        onOk={submitResetPassword}
        confirmLoading={loading}
        okText="确认重置"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" maxLength={128} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
