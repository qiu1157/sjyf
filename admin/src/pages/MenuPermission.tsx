import { useEffect, useState } from 'react';
import { Card, Checkbox, Button, message, Spin } from 'antd';
import request from '../utils/request';

// 主管角色固定（本期仅主管可配置）
const SUPERVISOR_ROLE = 3;

interface MenuItem {
  menu_key: string;
  label: string;
  is_visible: number;
}

export default function MenuPermission() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载当前角色菜单配置
  const load = async () => {
    setLoading(true);
    try {
      const data: MenuItem[] = await request.get(`/admin/role-menus/${SUPERVISOR_ROLE}`);
      setItems(data);
      setChecked(data.filter((it) => it.is_visible === 1).map((it) => it.menu_key));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // 保存配置
  const save = async () => {
    setSaving(true);
    try {
      await request.put(`/admin/role-menus/${SUPERVISOR_ROLE}`, { menu_keys: checked });
      message.success('菜单权限配置保存成功');
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="菜单权限配置"
      extra={<Button type="primary" onClick={save} loading={saving}>保存配置</Button>}
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: 16, color: '#666' }}>
          角色：主管（同角色共用一套配置，保存后对该角色下所有主管账号立即生效）
        </div>
        <Checkbox.Group
          value={checked}
          onChange={(vals) => setChecked(vals as string[])}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {items.map((it) => (
            <Checkbox key={it.menu_key} value={it.menu_key}>
              {it.label}（{it.menu_key}）
            </Checkbox>
          ))}
        </Checkbox.Group>
        {items.length === 0 && !loading && (
          <div style={{ color: '#999' }}>暂无可配置菜单项</div>
        )}
      </Spin>
    </Card>
  );
}
