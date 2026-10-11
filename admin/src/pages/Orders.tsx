import { useEffect, useState } from 'react';
import { Card, Table, Tag, Select, Input, Button, Space, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { openCancelAuditModal } from '../utils/order-cancel-audit';
import { buildOrderListParams } from './orders-filter-utils.mjs';

const { RangePicker } = DatePicker;

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  10: { text: '待支付', color: 'default' },
  20: { text: '待接单', color: 'orange' },
  30: { text: '待上门', color: 'blue' },
  40: { text: '服务中', color: 'processing' },
  60: { text: '待付尾款', color: 'gold' },
  80: { text: '已完成', color: 'success' },
  91: { text: '待取消', color: 'warning' },
  90: { text: '已取消', color: 'error' },
};

const EMPTY_FILTER_FORM = {
  status: undefined,
  order_no: '',
  user_keyword: '',
  service_item_id: undefined,
  leader_id: undefined,
  book_date_range: null,
  created_at_range: null,
};

export default function Orders() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 20 });
  const [formFilters, setFormFilters] = useState<any>(EMPTY_FILTER_FORM);
  const [serviceOptions, setServiceOptions] = useState<any[]>([]);
  const [leaderOptions, setLeaderOptions] = useState<any[]>([]);

  const load = () => {
    request.get('/admin/orders', { params: filters }).then(setData);
  };

  useEffect(() => { load(); }, [filters]);

  useEffect(() => {
    Promise.all([
      request.get('/admin/services', { params: { status: 1, pageSize: 200 } }),
      request.get('/admin/employees', { params: { role: 4, status: 1, pageSize: 200 } }),
    ]).then(([serviceResult, leaderResult]) => {
      setServiceOptions((serviceResult?.list || []).map((item: any) => ({
        value: item.id,
        label: item.name,
      })));
      setLeaderOptions((leaderResult?.list || []).map((item: any) => ({
        value: item.id,
        label: item.name,
      })));
    });
  }, []);

  const handleSearch = () => {
    setFilters(buildOrderListParams({
      ...formFilters,
      page: 1,
      pageSize: filters.pageSize || 20,
    }));
  };

  const handleReset = () => {
    setFormFilters(EMPTY_FILTER_FORM);
    setFilters({ page: 1, pageSize: 20 });
  };

  const columns = [
    { title: '订单号', dataIndex: 'order_no', width: 160 },
    { title: '服务', dataIndex: 'service_name' },
    { title: '预约日期', dataIndex: 'book_date', width: 110 },
    { title: '预约时段', dataIndex: 'book_time', width: 130 },
    { title: '总金额', dataIndex: 'total_amount', width: 100, render: (v: any) => `¥${v}` },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (v: any) => new Date(v).toLocaleString() },
    {
      title: '操作', width: 220, fixed: 'right' as const,
      render: (_: any, row: any) => (
        <Space size="small">
          <Button type="link" onClick={() => navigate(`/orders/${row.id}`)}>详情</Button>
          {row.status === 91 && (
            <>
              <Button
                type="link"
                onClick={() => openCancelAuditModal({ orderId: row.id, approved: true, onSuccess: load })}
              >
                同意取消
              </Button>
              <Button
                type="link"
                danger
                onClick={() => openCancelAuditModal({ orderId: row.id, approved: false, onSuccess: load })}
              >
                拒绝取消
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="订单管理">
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size="middle">
        <Select
          allowClear
          placeholder="订单状态"
          style={{ width: 140 }}
          value={formFilters.status}
          onChange={(value) => setFormFilters({ ...formFilters, status: value })}
          options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: +k, label: v.text }))}
        />
        <Input
          placeholder="订单号"
          style={{ width: 180 }}
          allowClear
          value={formFilters.order_no}
          onChange={(e) => setFormFilters({ ...formFilters, order_no: e.target.value })}
          onPressEnter={handleSearch}
        />
        <Input
          placeholder="用户姓名/手机号"
          style={{ width: 220 }}
          allowClear
          value={formFilters.user_keyword}
          onChange={(e) => setFormFilters({ ...formFilters, user_keyword: e.target.value })}
          onPressEnter={handleSearch}
        />
        <Select
          allowClear
          showSearch
          placeholder="服务项目"
          style={{ width: 180 }}
          value={formFilters.service_item_id}
          onChange={(value) => setFormFilters({ ...formFilters, service_item_id: value })}
          options={serviceOptions}
          optionFilterProp="label"
        />
        <Select
          allowClear
          showSearch
          placeholder="领队"
          style={{ width: 160 }}
          value={formFilters.leader_id}
          onChange={(value) => setFormFilters({ ...formFilters, leader_id: value })}
          options={leaderOptions}
          optionFilterProp="label"
        />
        <RangePicker
          value={formFilters.book_date_range}
          onChange={(value) => setFormFilters({ ...formFilters, book_date_range: value })}
          placeholder={['预约开始', '预约结束']}
        />
        <RangePicker
          value={formFilters.created_at_range}
          onChange={(value) => setFormFilters({ ...formFilters, created_at_range: value })}
          placeholder={['下单开始', '下单结束']}
        />
        <Button type="primary" onClick={handleSearch}>查询</Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data.list}
        pagination={{
          current: filters.page, pageSize: filters.pageSize, total: data.total,
          onChange: (page, pageSize) => setFilters({ ...filters, page, pageSize }),
        }}
        scroll={{ x: 1400 }}
      />
    </Card>
  );
}
