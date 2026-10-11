import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, message } from 'antd';
import request from '../utils/request';

export default function Materials() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 20 });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => request.get('/admin/materials', { params: filters }).then(setData);
  useEffect(() => { load(); }, [filters]);

  const open = (row?: any) => { setEditing(row); form.resetFields(); if (row) form.setFieldsValue(row); setModal(true); };
  const submit = async () => {
    const v = await form.validateFields();
    if (editing) await request.put(`/admin/materials/${editing.id}`, v);
    else await request.post('/admin/materials', v);
    message.success('保存成功'); setModal(false); load();
  };
  const toggle = async (row: any) => {
    await request.put(`/admin/materials/${row.id}/status`, { status: row.status === 1 ? 0 : 1 });
    load();
  };

  return (
    <Card title="物料管理" extra={<Button type="primary" onClick={() => open()}>新增物料</Button>}>
      <Table
        rowKey="id" dataSource={data.list}
        pagination={{ current: filters.page, total: data.total, onChange: (p, ps) => setFilters({ ...filters, page: p, pageSize: ps }) }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '物料名称', dataIndex: 'name' },
          { title: '分类', dataIndex: 'category' },
          { title: '规格', dataIndex: 'specification' },
          { title: '单位', dataIndex: 'unit' },
          { title: '状态', dataIndex: 'status', render: (s: number) => s === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag> },
          {
            title: '操作', render: (_, r) => <Space>
              <Button size="small" type="link" onClick={() => open(r)}>编辑</Button>
              <Button size="small" type="link" onClick={() => toggle(r)}>{r.status === 1 ? '禁用' : '启用'}</Button>
            </Space>,
          },
        ]}
      />
      <Modal title={editing ? '编辑物料' : '新增物料'} open={modal} onCancel={() => setModal(false)} onOk={submit}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类"><Input /></Form.Item>
          <Form.Item name="specification" label="规格"><Input /></Form.Item>
          <Form.Item name="unit" label="单位"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
