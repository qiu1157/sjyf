import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, message } from 'antd';
import request from '../utils/request';

const TYPE: Record<number, string> = { 1: '满减', 2: '折扣', 3: '无门槛' };

export default function Coupons() {
  const [list, setList] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => request.get('/admin/coupons').then(setList);
  useEffect(() => { load(); }, []);

  const open = (row?: any) => { setEditing(row); form.resetFields(); if (row) form.setFieldsValue(row); setModal(true); };
  const submit = async () => {
    const v = await form.validateFields();
    if (editing) await request.put(`/admin/coupons/${editing.id}`, v);
    else await request.post('/admin/coupons', v);
    message.success('保存成功'); setModal(false); load();
  };

  return (
    <Card title="优惠券管理" extra={<Button type="primary" onClick={() => open()}>新建优惠券</Button>}>
      <Table
        rowKey="id" dataSource={list}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '名称', dataIndex: 'name' },
          { title: '类型', dataIndex: 'type', render: (t: number) => <Tag>{TYPE[t]}</Tag> },
          { title: '面值', dataIndex: 'value', render: (v: any, r: any) => r.type === 2 ? `${v}折` : `¥${v}` },
          { title: '门槛', dataIndex: 'min_amount', render: (v: any) => `¥${v}` },
          { title: '有效期', dataIndex: 'valid_days', render: (v: number) => `${v}天` },
          { title: '总量', dataIndex: 'total_quantity' },
          { title: '已使用', dataIndex: 'used_quantity' },
          { title: '状态', dataIndex: 'status', render: (s: number) => s === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag> },
          { title: '操作', render: (_, r) => <Button type="link" size="small" onClick={() => open(r)}>编辑</Button> },
        ]}
      />
      <Modal title={editing ? '编辑' : '新建'} open={modal} onCancel={() => setModal(false)} onOk={submit}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={Object.entries(TYPE).map(([k, v]) => ({ value: +k, label: v }))} />
          </Form.Item>
          <Form.Item name="value" label="面值/折扣" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="min_amount" label="最低使用金额"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="valid_days" label="有效期（天）"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="total_quantity" label="发行总量"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
