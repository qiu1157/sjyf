import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

export default function Login() {
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    const data: any = await request.post('/admin/login', values);
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.userInfo));
    // 存储可见菜单，供 Layout 动态渲染与路由守卫使用
    localStorage.setItem('admin_menus', JSON.stringify(data.menus || []));
    message.success('登录成功');
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #C2956E 0%, #8B6B4F 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Card style={{ width: 400, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ color: '#8B6B4F', margin: 0 }}>拾家有方</h1>
          <p style={{ color: '#999', marginTop: 8 }}>商家管理后台</p>
        </div>
        <Form onFinish={onFinish} initialValues={{ username: 'admin', password: '123456' }}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input placeholder="账号" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">登录</Button>
        </Form>
        <div style={{ marginTop: 16, color: '#999', fontSize: 12, textAlign: 'center' }}>
          测试账号：admin / 123456 · 当前为开发环境
        </div>
      </Card>
    </div>
  );
}
