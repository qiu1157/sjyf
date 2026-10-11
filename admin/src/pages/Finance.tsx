import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Table, Tag } from 'antd';
import { DollarOutlined, RollbackOutlined, ShoppingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';

const { RangePicker } = DatePicker;

export default function Finance() {
  const [overview, setOverview] = useState<any>({});
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [range, setRange] = useState<any>(null);
  const [page, setPage] = useState(1);

  const params = () => {
    const p: any = { page, pageSize: 20 };
    if (range) { p.start_date = range[0].format('YYYY-MM-DD'); p.end_date = range[1].format('YYYY-MM-DD'); }
    return p;
  };

  const load = () => {
    request.get('/admin/finance/overview', { params: params() }).then(setOverview);
    request.get('/admin/finance/orders', { params: params() }).then(setData);
  };

  useEffect(() => { load(); }, [range, page]);

  return (
    <div>
      <Card title="账务概览" extra={<RangePicker onChange={(d) => setRange(d)} />}>
        <Row gutter={16}>
          <Col span={6}><Statistic title="订单笔数" value={overview.orderCount || 0} prefix={<ShoppingOutlined />} /></Col>
          <Col span={6}><Statistic title="首款收入" value={overview.firstPaySum || 0} precision={2} prefix={<DollarOutlined />} valueStyle={{ color: '#C2956E' }} suffix="元" /></Col>
          <Col span={6}><Statistic title="尾款收入" value={overview.finalPaySum || 0} precision={2} prefix={<DollarOutlined />} valueStyle={{ color: '#52c41a' }} suffix="元" /></Col>
          <Col span={6}><Statistic title="取消笔数" value={overview.refundCount || 0} prefix={<RollbackOutlined />} valueStyle={{ color: '#f5222d' }} /></Col>
        </Row>
      </Card>

      <Card title="订单流水" style={{ marginTop: 16 }}>
        <Tag color="orange" style={{ marginBottom: 12 }}>当前为模拟支付环境</Tag>
        <Table
          rowKey="id" dataSource={data.list}
          pagination={{ current: page, total: data.total, onChange: setPage }}
          columns={[
            { title: '订单号', dataIndex: 'order_no' },
            { title: '服务', dataIndex: 'service_name' },
            { title: '总金额', dataIndex: 'total_amount', render: (v: any) => `¥${v}` },
            { title: '首款', dataIndex: 'first_payment', render: (v: any, r: any) => `¥${v} ${r.first_pay_time ? '✅' : '-'}` },
            { title: '尾款', dataIndex: 'final_payment', render: (v: any, r: any) => `¥${v} ${r.final_pay_time ? '✅' : '-'}` },
            { title: '创建时间', dataIndex: 'created_at', render: (v: any) => dayjs(v).format('MM-DD HH:mm') },
          ]}
        />
      </Card>
    </div>
  );
}
