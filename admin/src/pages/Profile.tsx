import { useState } from 'react';
import { Card, Descriptions, Tag, Form, Input, Button, Modal, message } from 'antd';
import { colors } from '../theme';
import request from '../utils/request';

// 角色映射
const ROLE: Record<number, string> = { 1: '系统管理员', 2: '店长', 3: '主管', 4: '领队', 5: '服务人员' };

export default function Profile() {
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      await request.put('/admin/profile/password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功');
      form.resetFields();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="个人中心">
      <Descriptions column={1} bordered>
        <Descriptions.Item label="账号">{user.username || '-'}</Descriptions.Item>
        <Descriptions.Item label="姓名">{user.name || '-'}</Descriptions.Item>
        <Descriptions.Item label="角色">
          <Tag color="blue">{ROLE[user.role] || '未知'}</Tag>
        </Descriptions.Item>
      </Descriptions>
      <Card size="small" style={{ marginTop: 16, background: colors.neutral50 }}
      >
        <Button
          type="primary"
          onClick={() => {
            form.resetFields();
            setOpen(true);
          }}
        >
          修改密码
        </Button>
      </Card>
      <Modal
        title="修改密码"
        open={open}
        onCancel={() => {
          if (!loading) {
            form.resetFields();
            setOpen(false);
          }
        }}
        onOk={submit}
        confirmLoading={loading}
        okText="确认修改"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" maxLength={128} />
          </Form.Item>
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
                  return Promise.reject(new Error('两次输入的新密码不一致'));
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
