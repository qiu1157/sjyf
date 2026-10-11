import { useEffect, useState } from 'react';
import { Avatar, Button, Card, Descriptions, Empty, Space, Table, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import request from '../utils/request';

const fmtTime = (t?: string | null) => (t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-');
const ORDER_STATUS: Record<number, { text: string; color: string }> = {
  10: { text: '待支付', color: 'default' },
  20: { text: '待接单', color: 'orange' },
  30: { text: '待上门', color: 'blue' },
  40: { text: '服务中', color: 'processing' },
  60: { text: '待付尾款', color: 'gold' },
  80: { text: '已完成', color: 'success' },
  90: { text: '已取消', color: 'error' },
  91: { text: '待取消', color: 'warning' },
};

export default function WxUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    request.get(`/admin/users/${id}`).then(setDetail);
  }, [id]);

  if (!detail) return null;

  const { user, orders, addresses, leaderProfile } = detail;

  return (
    <div>
      <Card
        title="用户详情"
        extra={<Button onClick={() => navigate(-1)}>返回</Button>}
      >
        <Space size={16} align="start">
          <Avatar src={user.avatar} icon={<UserOutlined />} size={64} />
          <Descriptions column={1} bordered size="small" style={{ flex: 1 }}>
            <Descriptions.Item label="昵称">{user.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{user.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="性别">{user.gender === 1 ? '男' : user.gender === 2 ? '女' : '-'}</Descriptions.Item>
            <Descriptions.Item label="注册时间">{fmtTime(user.created_at)}</Descriptions.Item>
            <Descriptions.Item label="最近登录">{fmtTime(user.last_login_time)}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Card title="关联订单" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          dataSource={orders}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关联订单" /> }}
          pagination={false}
          columns={[
            { title: '订单号', dataIndex: 'order_no', width: 160 },
            { title: '服务项目', dataIndex: 'service_name' },
            {
              title: '状态',
              dataIndex: 'status',
              width: 110,
              render: (value: number) => <Tag color={ORDER_STATUS[value]?.color || 'default'}>{ORDER_STATUS[value]?.text || `状态${value}`}</Tag>,
            },
            { title: '金额', dataIndex: 'total_amount', width: 100, render: (value: number | string) => `¥${value}` },
            { title: '预约时间', width: 180, render: (_, record: any) => `${record.book_date || '-'} ${record.book_time || ''}`.trim() || '-' },
            { title: '创建时间', dataIndex: 'created_at', width: 180, render: fmtTime },
          ]}
        />
      </Card>

      <Card title="地址信息" style={{ marginTop: 16 }}>
        {addresses?.length ? (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {addresses.map((item: any) => (
              <Card key={item.id} size="small">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="联系人">
                    <Space size={8}>
                      <span>{item.contact_name || '-'}</span>
                      {item.is_default === 1 ? <Tag color="gold">默认地址</Tag> : null}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">{item.contact_phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="服务地址">{item.full_address || '-'}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{fmtTime(item.updated_at)}</Descriptions.Item>
                </Descriptions>
              </Card>
            ))}
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该用户暂无地址信息" />
        )}
      </Card>

      <Card title="领队档案" style={{ marginTop: 16 }}>
        {leaderProfile ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="姓名">{leaderProfile.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{leaderProfile.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{leaderProfile.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="启用状态">
              {leaderProfile.status === 1 ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="领队身份">
              {leaderProfile.is_leader_active === 1 ? <Tag color="orange">有效领队</Tag> : <Tag>历史领队</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="关联订单数">{leaderProfile.order_count}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该用户暂无领队档案" />
        )}
      </Card>
    </div>
  );
}
