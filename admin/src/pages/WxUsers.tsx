import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, Avatar, message, Empty } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

const fmtTime = (t?: string | null) => (t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-');

export default function WxUsers() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 20 });
  const [modal, setModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const load = () => request.get('/admin/users', { params: filters }).then(setData);
  useEffect(() => { load(); }, [filters]);

  // 打开设置为领队 Modal：姓名默认昵称，手机号默认用户手机号
  const openSetLeader = (record: any) => {
    setCurrentUser(record);
    form.setFieldsValue({
      name: record.nickname,
      phone: record.phone || '',
      status: 1,
      remark: '',
    });
    setModal(true);
  };

  const submitSetLeader = async () => {
    const v = await form.validateFields();
    setLoading(true);
    try {
      await request.post(`/admin/users/${currentUser.id}/set-leader`, v);
      message.success('已设置为领队');
      setModal(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLeader = (record: any) => {
    Modal.confirm({
      title: `确认取消「${record.nickname}」的领队身份吗？`,
      content: '取消后，该用户下次登录小程序将回归普通用户；若存在待上门、服务中、待付尾款订单，系统会阻止本次操作。',
      okText: '确认取消',
      cancelText: '取消',
      onOk: async () => {
        await request.post(`/admin/users/${record.id}/cancel-leader`);
        message.success('已取消领队身份');
        load();
      },
    });
  };

  return (
    <Card title="用户信息">
      <Space style={{ marginBottom: 16 }} size="middle">
        <Select
          allowClear
          placeholder="角色标记"
          style={{ width: 140 }}
          value={filters.role}
          onChange={(v) => setFilters({ ...filters, role: v, page: 1 })}
          options={[
            { value: 1, label: '普通用户' },
            { value: 2, label: '领队' },
          ]}
        />
        <Input.Search
          allowClear
          placeholder="微信昵称/手机号"
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
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={filters.keyword || filters.role ? '没有找到符合条件的微信用户' : '暂无微信授权用户'}
            />
          ),
        }}
        columns={[
          {
            title: '用户',
            render: (_, r: any) => (
              <Space>
                <Avatar src={r.avatar} icon={<UserOutlined />} size="small" />
                <span>{r.nickname}</span>
              </Space>
            ),
          },
          {
            title: '角色标记',
            dataIndex: 'is_leader',
            render: (v: number) => (v === 1 ? <Tag color="orange">领队</Tag> : <Tag color="blue">普通用户</Tag>),
          },
          { title: '手机号', dataIndex: 'phone', render: (v: string) => v || '-' },
          { title: '性别', dataIndex: 'gender', render: (g: number) => (g === 1 ? '男' : g === 2 ? '女' : '-') },
          { title: '注册时间', dataIndex: 'created_at', render: fmtTime, width: 180 },
          { title: '最近登录', dataIndex: 'last_login_time', render: fmtTime, width: 180 },
          {
            title: '操作',
            render: (_, r: any) =>
              r.is_leader === 1 ? (
                <Space size="small">
                  <Button type="link" size="small" onClick={() => navigate(`/wx-users/${r.id}`)}>
                    查看详情
                  </Button>
                  <Tag color="orange">已是领队</Tag>
                  <Button type="link" size="small" danger onClick={() => handleCancelLeader(r)}>
                    取消领队身份
                  </Button>
                </Space>
              ) : (
                <Space size="small">
                  <Button type="link" size="small" onClick={() => navigate(`/wx-users/${r.id}`)}>
                    查看详情
                  </Button>
                  <Button type="link" size="small" onClick={() => openSetLeader(r)}>设置为领队</Button>
                </Space>
              ),
            width: 260,
          },
        ]}
      />
      <Modal
        title="设置为领队"
        open={modal}
        onCancel={() => setModal(false)}
        onOk={submitSetLeader}
        confirmLoading={loading}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginBottom: 16, color: 'rgba(0, 0, 0, 0.45)' }}>
          将用户「{currentUser?.nickname}」设置为领队，绑定其微信 openid
        </div>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="领队姓名" maxLength={32} />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input placeholder="领队手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="技能专长、所属区域等（选填）" maxLength={512} rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
