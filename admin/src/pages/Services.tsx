import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, Popconfirm, message, Radio } from 'antd';
import dayjs from 'dayjs';
import request from '../utils/request';
import { colors } from '../theme';
import ImageUpload from '../components/ImageUpload';
import ServiceContentEditor from '../components/ServiceContentEditor';

export default function Services() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [cats, setCats] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 20 });
  const [searchCat, setSearchCat] = useState<number | undefined>();
  const [searchStatus, setSearchStatus] = useState<number | undefined>();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => request.get('/admin/services', { params: filters }).then(setData);
  useEffect(() => { load(); }, [filters]);
  useEffect(() => { request.get('/admin/categories').then((d: any) => setCats(d)); }, []);

  const catName = (id: number) => cats.find(c => c.id === id)?.name || '-';

  const open = (row?: any) => {
    setEditing(row);
    form.resetFields();
    if (row) {
      // 接口返回的 content_blocks 是 JSON 字符串，需先解析为对象再回填；
      // 否则表单校验器拿不到 blocks 数组，编辑已有服务时会误报「请至少添加一个内容块」
      let contentBlocks = row.content_blocks;
      if (typeof contentBlocks === 'string') {
        try {
          contentBlocks = JSON.parse(contentBlocks);
        } catch {
          contentBlocks = null;
        }
      }
      form.setFieldsValue({ ...row, content_blocks: contentBlocks });
    } else {
      form.setFieldsValue({ display_zone: 0, status: 0, sort: 0 });
    }
    setModal(true);
  };

  const submit = async () => {
    // 校验失败由表单内联提示展示；此处吞掉 validateFields 的 reject，避免未捕获的 Promise 拒绝
    let v: any;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    if (editing) await request.put(`/admin/services/${editing.id}`, v);
    else {
      await request.post('/admin/services', v);
      // 新增后跳到第 1 页，展示新数据
      setFilters({ ...filters, page: 1 });
    }
    message.success('保存成功');
    setModal(false); load();
  };

  const toggle = async (row: any) => {
    await request.put(`/admin/services/${row.id}/status`, { status: row.status === 1 ? 0 : 1 });
    message.success(row.status === 1 ? '下架成功' : '上架成功');
    load();
  };

  const del = async (row: any) => {
    try {
      await request.delete(`/admin/services/${row.id}`);
      message.success('删除成功');
      load();
    } catch (err) {
      // request 拦截器已 message.error 提示
    }
  };

  const doSearch = () => setFilters({
    ...filters,
    category_id: searchCat,
    status: searchStatus,
    keyword: searchKeyword || undefined,
    page: 1,
  });

  const doReset = () => {
    setSearchCat(undefined);
    setSearchStatus(undefined);
    setSearchKeyword('');
    setFilters({ page: 1, pageSize: filters.pageSize });
  };

  const columns = [
    {
      title: '缩略图', dataIndex: 'thumbnail_image', width: 90,
      render: (_: any, r: any) => {
        const img = r.thumbnail_image || r.cover_image;
        return img
          ? <img src={img} alt={r.name} style={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 6, border: `1px solid ${colors.neutral200}` }} />
          : <div style={{ width: 60, height: 45, borderRadius: 6, background: colors.neutral100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.neutral400, fontSize: 11 }}>无图</div>;
      },
    },
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '服务标题', dataIndex: 'name', width: 220 },
    { title: '所属品类', dataIndex: 'category_id', width: 100, render: (id: number) => catName(id) },
    {
      title: '原价', dataIndex: 'price', width: 90,
      render: (price: number, r: any) => {
        const hasPromo = r.promo_price != null && Number(r.promo_price) > 0;
        return <span style={{ textDecoration: hasPromo ? 'line-through' : 'none', color: hasPromo ? colors.neutral400 : colors.neutral600 }}>¥{Number(price).toFixed(2)}</span>;
      },
    },
    {
      title: '促销价', dataIndex: 'promo_price', width: 90,
      render: (promo: number) => promo != null && Number(promo) > 0
        ? <span style={{ color: colors.primary, fontWeight: 600 }}>¥{Number(promo).toFixed(2)}</span>
        : <span style={{ color: colors.neutral400 }}>-</span>,
    },
    { title: '排序', dataIndex: 'sort', width: 70, sorter: (a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0) },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s: number) => s === 1 ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>,
    },
    {
      title: '创建时间', dataIndex: 'created_at', width: 120,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD'),
    },
    {
      title: '最后修改时间', dataIndex: 'updated_at', width: 140,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', width: 200,
      render: (_: any, row: any) => (
        <Space>
          <Button size="small" type="link" onClick={() => open(row)}>编辑</Button>
          <Popconfirm
            title={row.status === 1 ? '确认下架该服务？' : '确认上架该服务？'}
            description={row.status === 1 ? '下架后用户端将不再展示该服务' : '上架后用户端将展示该服务'}
            okText="确认"
            cancelText="取消"
            onConfirm={() => toggle(row)}
          >
            <Button size="small" type="link">{row.status === 1 ? '下架' : '上架'}</Button>
          </Popconfirm>
          <Popconfirm
            title="确认删除该服务？"
            description="删除后不可恢复，请谨慎操作"
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => del(row)}
          >
            <Button size="small" type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="服务管理"
      extra={<Button type="primary" onClick={() => open()}>新增服务</Button>}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          style={{ width: 160 }}
          placeholder="全部品类"
          allowClear
          value={searchCat}
          onChange={setSearchCat}
          options={cats.map(c => ({ value: c.id, label: c.name }))}
        />
        <Select
          style={{ width: 120 }}
          placeholder="全部状态"
          allowClear
          value={searchStatus}
          onChange={setSearchStatus}
          options={[{ value: 1, label: '上架' }, { value: 0, label: '下架' }]}
        />
        <Input
          style={{ width: 220 }}
          placeholder="搜索服务标题"
          allowClear
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onPressEnter={doSearch}
        />
        <Button type="primary" onClick={doSearch}>查询</Button>
        <Button onClick={doReset}>重置</Button>
      </div>
      <Table
        rowKey="id" columns={columns} dataSource={data.list}
        pagination={{
          current: filters.page, pageSize: filters.pageSize, total: data.total,
          onChange: (p, ps) => setFilters({ ...filters, page: p, pageSize: ps }),
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />
      <Modal
        title={editing ? '编辑服务' : '新增服务'}
        open={modal}
        onCancel={() => setModal(false)}
        onOk={submit}
        width={1100}
        destroyOnClose
        styles={{ body: { maxHeight: '72vh', overflowY: 'auto', paddingRight: 8 } }}
      >
        <Form form={form} layout="vertical">
          {/* ① 服务档案：结构化档案字段，7 项 */}
          <Card size="small" title="服务档案" style={{ marginBottom: 16, borderColor: colors.neutral200 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              <Form.Item name="service_mode" label="服务方式" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="请选择" options={[
                  { value: 1, label: '上门服务' },
                  { value: 2, label: '到店服务' },
                  { value: 3, label: '上门/到店均可' },
                ]} />
              </Form.Item>
              <Form.Item name="duration" label="服务时长(分钟)" rules={[{ required: true, message: '请输入时长' }]} style={{ marginBottom: 0 }}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="people_count" label="服务人数(人)" style={{ marginBottom: 0 }}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="空=不限" />
              </Form.Item>
              <Form.Item name="area_max" label="适用面积(㎡)" style={{ marginBottom: 0 }}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="空=不限" />
              </Form.Item>
              <Form.Item name="price_unit" label="计价方式" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="请选择" options={[
                  { value: 1, label: '按次一口价' },
                  { value: 2, label: '按小时计费' },
                  { value: 3, label: '按平方米计费' },
                  { value: 4, label: '按人天计费' },
                  { value: 5, label: '面议' },
                ]} />
              </Form.Item>
              <Form.Item name="scope" label="服务地域" style={{ marginBottom: 0 }}>
                <Input placeholder="如：朝阳区 / 全城，空=到店咨询" maxLength={512} />
              </Form.Item>
              <Form.Item name="validity_days" label="服务期限(天)" style={{ marginBottom: 0 }}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="空=长期有效" />
              </Form.Item>
            </div>
          </Card>

          {/* ② 详情编排：标题、简介、结构化详情 */}
          <Card size="small" title="详情编排" style={{ marginBottom: 16, borderColor: colors.neutral200 }}>
            <Form.Item name="name" label="服务标题" rules={[
              { required: true, message: '请输入服务标题' },
              { max: 50, message: '标题不超过 50 字符' },
            ]}>
              <Input placeholder="1-50 字符" />
            </Form.Item>

            <Form.Item name="description" label="服务简介" rules={[
              { required: true, message: '请输入简介' },
              { max: 500, message: '简介不超过 500 字符' },
            ]}>
              <Input.TextArea rows={2} placeholder="1-500 字符" showCount maxLength={500} />
            </Form.Item>

            <Form.Item
              name="content_blocks"
              label="详情说明"
              rules={[
                { required: true, message: '请至少添加一个内容块' },
                {
                  // 空块数组是合法对象，required 拦不住，需显式校验
                  validator: (_, val) =>
                    val && Array.isArray(val.blocks) && val.blocks.length > 0
                      ? Promise.resolve()
                      : Promise.reject(new Error('请至少添加一个内容块')),
                },
              ]}
            >
              <ServiceContentEditor legacyContent={editing?.content} />
            </Form.Item>
          </Card>

          {/* ③ 运营投放：品类、价格、图片、专区、上架状态 */}
          <Card size="small" title="运营投放" style={{ borderColor: colors.neutral200 }}>
            <Form.Item name="category_id" label="所属品类" rules={[{ required: true, message: '请选择品类' }]}>
              <Select placeholder="请选择" options={cats.map(c => ({ value: c.id, label: c.name }))} />
            </Form.Item>

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item name="price" label="价格(元)" rules={[
                { required: true, message: '请输入价格' },
                {
                  validator: (_, val) => val > 0 ? Promise.resolve() : Promise.reject(new Error('价格必须大于 0')),
                },
              ]} style={{ flex: 1 }}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder=">0，2位小数" />
              </Form.Item>
              <Form.Item name="promo_price" label="促销价(元)" rules={[
                {
                  validator: (_, val) => {
                    if (val == null || val === '') return Promise.resolve();
                    const price = form.getFieldValue('price');
                    if (val <= 0) return Promise.reject(new Error('促销价必须大于 0'));
                    if (price && val >= price) return Promise.reject(new Error('促销价必须小于价格'));
                    return Promise.resolve();
                  },
                },
              ]} style={{ flex: 1 }}>
                <InputNumber precision={2} style={{ width: '100%' }} placeholder="选填，须小于价格" />
              </Form.Item>
            </div>

            <Form.Item name="cover_image" label="服务封面图" rules={[{ required: true, message: '请上传封面图' }]}>
              <ImageUpload type="service-image" hint="JPG/PNG，≤2MB，推荐 400×300" />
            </Form.Item>

            <Form.Item name="display_zone" label="展示专区" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value={0}>无</Radio>
                <Radio value={1}>走马灯海报</Radio>
                <Radio value={2}>最新活动</Radio>
                <Radio value={3}>热销专区</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.display_zone !== cur.display_zone}>
              {({ getFieldValue }) => getFieldValue('display_zone') === 1 ? (
                <Form.Item name="banner_image" label="走马灯大图" rules={[
                  { required: true, message: '请上传走马灯大图' },
                ]}>
                  <ImageUpload type="service-image" hint="JPG/PNG，≤2MB，推荐 750×350" />
                </Form.Item>
              ) : null}
            </Form.Item>

            <Form.Item
              name="sort"
              label="排序"
              // sort 列为 NOT NULL：清空时 normalize 兜底为 0，避免提交 null 触发数据库报错
              normalize={(v) => (v == null ? 0 : v)}
              extra="数字越小越靠前；未设置（0）的服务按创建先后排列"
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越小越靠前，空=0" />
            </Form.Item>

            <Form.Item name="status" label="是否上架" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value={1}>是</Radio>
                <Radio value={0}>否</Radio>
              </Radio.Group>
            </Form.Item>
          </Card>
        </Form>
      </Modal>
    </Card>
  );
}
