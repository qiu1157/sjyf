import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Tag, Space, Popconfirm, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import request from '../utils/request';
import ImageUpload from '../components/ImageUpload';

export default function Categories() {
  const [list, setList] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => request.get('/admin/categories').then(setList);
  useEffect(() => { load(); }, []);

  const open = (row?: any) => {
    setEditing(row);
    form.resetFields();
    if (row) form.setFieldsValue(row);
    setModal(true);
  };
  const submit = async () => {
    const v = await form.validateFields();
    if (editing) await request.put(`/admin/categories/${editing.id}`, v);
    else await request.post('/admin/categories', v);
    message.success('保存成功'); setModal(false); load();
  };
  const toggle = async (row: any) => {
    await request.put(`/admin/categories/${row.id}/status`, { status: row.status === 1 ? 0 : 1 });
    load();
  };
  const del = async (row: any) => {
    try {
      await request.delete(`/admin/categories/${row.id}`);
      message.success('删除成功');
      load();
    } catch (err) {
      // 后端返回"该品类下有服务，请先删除或迁移服务"时，request 拦截器已 message.error 提示
    }
  };

  // 图标 URL：后端返回 /uploads/xxx，vite proxy 代理 /uploads 到后端
  const iconUrl = (icon: string) => icon || '';

  return (
    <Card title="服务品类" extra={<Button type="primary" onClick={() => open()}>新增品类</Button>}>
      <Table
        rowKey="id" dataSource={list}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          {
            title: '图标', dataIndex: 'icon', width: 80,
            render: (icon: string) => icon
              ? <img src={iconUrl(icon)} alt="品类图标" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #E7DECF' }} />
              : <span style={{ color: '#B8A78C', fontSize: 12 }}>无图标</span>,
          },
          { title: '品类名称', dataIndex: 'name' },
          { title: '排序', dataIndex: 'sort', width: 80 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => s === 1 ? <Tag color="green">上架</Tag> : <Tag>下架</Tag> },
          {
            title: '操作', width: 200,
            render: (_, r) => <Space>
              <Button size="small" type="link" onClick={() => open(r)}>编辑</Button>
              <Button size="small" type="link" onClick={() => toggle(r)}>{r.status === 1 ? '下架' : '上架'}</Button>
              <Popconfirm
                title="确认删除该品类？"
                description="删除后不可恢复，请谨慎操作"
                okText="确认删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => del(r)}
              >
                <Button size="small" type="link" danger>删除</Button>
              </Popconfirm>
            </Space>,
          },
        ]}
      />
      <Modal title={editing ? '编辑品类' : '新增品类'} open={modal} onCancel={() => setModal(false)} onOk={submit} width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入品类名称' }]}><Input placeholder="请输入品类名称" /></Form.Item>
          <Form.Item name="icon" label="品类图标">
            <ImageUpload type="category-icon" hint="推荐 200×200 正方形，JPG/PNG ≤500KB" />
          </Form.Item>
          <Form.Item name="sort" label="排序"><InputNumber style={{ width: '100%' }} placeholder="数字越小越靠前" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} placeholder="可选，品类描述" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
