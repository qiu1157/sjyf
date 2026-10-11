import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Tag } from 'antd';
import { ShoppingOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import request from '../utils/request';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>({});
  const [trend, setTrend] = useState<any[]>([]);
  const [todo, setTodo] = useState<any>({ pendingAccept: [], pendingAcceptance: [] });

  useEffect(() => {
    request.get('/admin/dashboard/summary').then(setSummary);
    request.get('/admin/dashboard/order-trend').then(setTrend);
    request.get('/admin/dashboard/todo-list').then(setTodo);
  }, []);

  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: trend.map((t) => t.date) },
    yAxis: { type: 'value' },
    series: [{
      name: '订单数', type: 'line', smooth: true,
      data: trend.map((t) => t.count),
      areaStyle: { color: 'rgba(194,149,110,0.2)' },
      itemStyle: { color: '#C2956E' },
    }],
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="今日订单" value={summary.todayOrders || 0} prefix={<ShoppingOutlined />} valueStyle={{ color: '#C2956E' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="今日营收" value={summary.todayRevenue || 0} precision={2} prefix={<DollarOutlined />} suffix="元" valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="待验收" value={summary.pendingAcceptance || 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="完成率" value={summary.completionRate || 0} suffix="%" prefix={<CheckCircleOutlined />} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="近7日订单趋势">
            <ReactECharts option={option} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="待处理事项">
            <h4>待接单</h4>
            <List
              dataSource={todo.pendingAccept}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta title={item.service} description={item.order_no} />
                  <Tag color="orange">待接单</Tag>
                </List.Item>
              )}
              locale={{ emptyText: '暂无待接单' }}
            />
            <h4 style={{ marginTop: 16 }}>待验收</h4>
            <List
              dataSource={todo.pendingAcceptance}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta title={item.service} description={item.order_no} />
                  <Tag color="blue">待验收</Tag>
                </List.Item>
              )}
              locale={{ emptyText: '暂无' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
