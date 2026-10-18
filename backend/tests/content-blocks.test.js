const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeBlocks,
  renderBlocksToHtml,
  parseStoredBlocks,
  summarizeBlocks,
} = require('../dist/modules/service/content-blocks.util');
const { ServiceService } = require('../dist/modules/service/service.service');

// ============ 测试夹具 ============

/** 造一个最简合法的块 payload */
function payloadWith(blocks) {
  return { version: 1, blocks };
}

/** 捕获 ServiceService 的仓库/日志调用 */
function createServiceFixture(initialItem) {
  const calls = { updatePayloads: [], savedPayloads: [], logs: [] };
  let current = initialItem ? { ...initialItem } : null;

  const itemRepo = {
    findOne: async () => (current ? { ...current } : null),
    create: (data) => ({ ...data }),
    save: async (data) => {
      calls.savedPayloads.push({ ...data });
      current = { ...data };
      return { ...current };
    },
    update: async (_id, data) => {
      calls.updatePayloads.push({ ...data });
      current = { ...current, ...data };
      return { affected: 1 };
    },
  };
  const catRepo = { findOne: async () => null };
  const logHelper = {
    write: async (entry) => {
      calls.logs.push(entry);
      return entry;
    },
  };

  return { service: new ServiceService(catRepo, itemRepo, logHelper), calls, setCurrent: (v) => (current = v) };
}

// ============ normalizeBlocks ============

test('normalizeBlocks：null / undefined / 空字符串 → null（本次不动）', () => {
  assert.equal(normalizeBlocks(null), null);
  assert.equal(normalizeBlocks(undefined), null);
  assert.equal(normalizeBlocks('   '), null);
});

test('normalizeBlocks：blocks 为空数组 → 报错「请至少添加一个内容块」', () => {
  assert.throws(() => normalizeBlocks({ version: 1, blocks: [] }), /请至少添加一个内容块/);
});

test('normalizeBlocks：非法 JSON 字符串抛错，提示格式不正确', () => {
  assert.throws(() => normalizeBlocks('{oops'), /内容块数据格式不正确/);
});

test('normalizeBlocks：blocks 非数组抛错', () => {
  assert.throws(() => normalizeBlocks({ version: 1, blocks: 'x' }), /内容块数据格式不正确/);
});

test('normalizeBlocks：超过 30 个块抛错', () => {
  const blocks = Array.from({ length: 31 }, () => ({ type: 'text', text: 'a' }));
  assert.throws(() => normalizeBlocks(payloadWith(blocks)), /内容块最多 30 个/);
});

test('normalizeBlocks：未知块类型直接抛错（不静默丢弃）', () => {
  assert.throws(
    () => normalizeBlocks(payloadWith([{ type: 'video', url: 'x' }])),
    /第 1 个块：不支持的块类型 video/,
  );
});

test('normalizeBlocks：错误信息带「第 N 个块：」前缀', () => {
  assert.throws(
    () => normalizeBlocks(payloadWith([{ type: 'text', text: 'ok' }, { type: 'heading', text: '' }])),
    /第 2 个块：小标题需 1-30 字符/,
  );
});

test('normalizeBlocks：补齐缺失 id、丢弃多余字段、imageGroup.columns 缺省为 2', () => {
  const result = normalizeBlocks(
    payloadWith([
      { type: 'heading', text: '服务亮点', extra: '应被丢弃' },
      { type: 'imageGroup', images: [{ url: '/uploads/services/a.jpg' }] },
    ]),
  );

  assert.equal(result.version, 1);
  assert.equal(result.blocks.length, 2);
  assert.match(result.blocks[0].id, /^b_/);
  assert.equal(result.blocks[0].extra, undefined);
  assert.equal(result.blocks[1].columns, 2);
  assert.equal(result.blocks[1].images[0].caption, undefined);
});

test('normalizeBlocks：图注超过 30 字符抛错', () => {
  assert.throws(
    () => normalizeBlocks(payloadWith([{ type: 'image', url: '/uploads/services/a.jpg', caption: 'x'.repeat(31) }])),
    /图注最多 30 字符/,
  );
});

test('normalizeBlocks：块内图片总数超过 30 张抛错', () => {
  // 4 组 × 9 张 = 36 张
  const blocks = Array.from({ length: 4 }, () => ({
    type: 'imageGroup',
    columns: 3,
    images: Array.from({ length: 9 }, (_, i) => ({ url: `/uploads/services/${i}.jpg` })),
  }));
  assert.throws(() => normalizeBlocks(payloadWith(blocks)), /内容块图片总数最多 30 张/);
});

// ============ renderBlocksToHtml ============

test('renderBlocksToHtml：文本转义并保留换行', () => {
  const html = renderBlocksToHtml(
    normalizeBlocks(payloadWith([{ type: 'text', text: '<b>加粗</b>\n第二行 & "引号"' }])),
  );

  assert.ok(html.includes('&lt;b&gt;加粗&lt;/b&gt;'), '应转义尖括号');
  assert.ok(html.includes('<br/>'), '换行应转 <br/>');
  assert.ok(html.includes('&amp;'), '& 应转义');
  assert.ok(html.includes('&quot;'), '双引号应转义');
  assert.ok(!html.includes('<b>加粗</b>'), '不应保留未转义标签');
});

test('renderBlocksToHtml：全部使用内联样式，且不使用 display:grid', () => {
  const html = renderBlocksToHtml(
    normalizeBlocks(
      payloadWith([
        { type: 'heading', text: '标题' },
        { type: 'imageGroup', columns: 2, images: [{ url: '/uploads/services/a.jpg' }, { url: '/uploads/services/b.jpg' }] },
        { type: 'params', items: [{ label: '面积', value: '100㎡' }] },
      ]),
    ),
  );

  assert.ok(html.includes('border-left:3px solid #B76E45'), '小标题应带主色左条');
  assert.ok(html.includes('display:flex'), '宫格应使用 flex 布局');
  assert.ok(html.includes('flex-wrap:wrap'), '宫格应使用 flex-wrap');
  assert.ok(!html.includes('display:grid'), '不应使用小程序兼容差的 display:grid');
  assert.ok(html.includes('width:50%'), '两列宫格宽度应为 50%');
  assert.ok(html.includes('<table'), '参数块应输出表格');
});

test('renderBlocksToHtml：三列宫格宽度为 33.33%', () => {
  const html = renderBlocksToHtml(
    normalizeBlocks(
      payloadWith([
        { type: 'imageGroup', columns: 3, images: [{ url: '/uploads/services/a.jpg' }] },
      ]),
    ),
  );
  assert.ok(html.includes('width:33.33%'));
});

// ============ parseStoredBlocks / summarizeBlocks ============

test('parseStoredBlocks：脏数据返回 null 且不抛错', () => {
  assert.equal(parseStoredBlocks(null), null);
  assert.equal(parseStoredBlocks(''), null);
  assert.equal(parseStoredBlocks('not-json'), null);
  assert.equal(parseStoredBlocks('{"version":1}'), null);
});

test('parseStoredBlocks：正常 JSON 字符串解析为对象', () => {
  const parsed = parseStoredBlocks(JSON.stringify(payloadWith([{ id: 'b_1', type: 'text', text: 'x' }])));
  assert.equal(parsed.version, 1);
  assert.equal(parsed.blocks[0].text, 'x');
});

test('summarizeBlocks：返回块数量与去重后的类型，不含全文', () => {
  const summary = summarizeBlocks(
    JSON.stringify(
      payloadWith([
        { id: 'b_1', type: 'heading', text: '标题' },
        { id: 'b_2', type: 'text', text: '很长的一段正文' },
        { id: 'b_3', type: 'text', text: '另一段' },
      ]),
    ),
  );

  assert.equal(summary.blocks_count, 3);
  assert.deepEqual(summary.block_types, ['heading', 'text']);
  assert.equal(JSON.stringify(summary).includes('很长的一段正文'), false, '不应记录正文');
});

test('summarizeBlocks：脏数据返回 0 与空数组', () => {
  assert.deepEqual(summarizeBlocks('bad-json'), { blocks_count: 0, block_types: [] });
});

// ============ ServiceService 写入双写 ============

test('createItem：块数据校验后双写 content_blocks（JSON 真身）与 content（HTML 快照）', async () => {
  const { service, calls } = createServiceFixture(null);

  await service.createItem({
    name: '日常保洁',
    category_id: 1,
    content_blocks: {
      version: 1,
      blocks: [{ type: 'heading', text: '服务亮点' }, { type: 'text', text: '专业团队上门' }],
    },
  });

  const payload = calls.savedPayloads[0];
  assert.equal(typeof payload.content_blocks, 'string', 'content_blocks 落库应为字符串');
  assert.equal(JSON.parse(payload.content_blocks).blocks.length, 2);
  assert.ok(payload.content.includes('服务亮点'), 'content 应为生成的 HTML 快照');
  assert.ok(payload.content.includes('专业团队上门'));
});

test('createItem：未传块数据时不写 content_blocks（保持 NULL）', async () => {
  const { service, calls } = createServiceFixture(null);

  await service.createItem({ name: '新服务', category_id: 1, content: '历史纯文本详情' });

  const payload = calls.savedPayloads[0];
  assert.equal(payload.content_blocks, undefined, '不应凭空写入 content_blocks');
  assert.equal(payload.content, '历史纯文本详情', '历史 content 原样保留');
});

test('createItem：块数据非法时抛错且不落库', async () => {
  const { service, calls } = createServiceFixture(null);

  await assert.rejects(
    () => service.createItem({ name: 'x', category_id: 1, content_blocks: payloadWith([{ type: 'video' }]) }),
    /不支持的块类型 video/,
  );
  assert.equal(calls.savedPayloads.length, 0, '校验失败不应落库');
});

test('updateItem：传块数据时同步更新 content 快照', async () => {
  const { service, calls, setCurrent } = createServiceFixture({
    id: 9,
    name: '旧服务',
    is_deleted: 0,
    status: 1,
    display_zone: 0,
    content: '旧纯文本',
    content_blocks: null,
  });
  setCurrent({ id: 9, name: '旧服务', is_deleted: 0, status: 1, display_zone: 0, content: '旧纯文本', content_blocks: null });

  await service.updateItem(9, {
    name: '旧服务',
    content_blocks: { version: 1, blocks: [{ type: 'text', text: '新版详情' }] },
  });

  const payload = calls.updatePayloads[0];
  assert.equal(JSON.parse(payload.content_blocks).blocks[0].text, '新版详情');
  assert.ok(payload.content.includes('新版详情'), 'content 快照应同步更新');
});

test('updateItem：content_blocks 传 null 视为「本次不动」，不动旧 content', async () => {
  const base = {
    id: 9,
    name: '旧服务',
    is_deleted: 0,
    status: 1,
    display_zone: 0,
    content: '<p>旧快照</p>',
    content_blocks: '{"version":1,"blocks":[{"id":"b_1","type":"text","text":"旧块"}]}',
  };

  const { service, calls } = createServiceFixture({ ...base });
  await service.updateItem(9, { name: '旧服务', content_blocks: null });

  const payload = calls.updatePayloads[0];
  assert.equal(payload.content_blocks, undefined, '未传块不应写入 content_blocks');
  assert.equal(payload.content, undefined, '未传块不应覆盖旧 content');
});

test('updateItem：content_blocks 传空数组 → 报错且不落库', async () => {
  const { service, calls } = createServiceFixture({
    id: 9,
    name: '旧服务',
    is_deleted: 0,
    status: 1,
    display_zone: 0,
    content: '<p>旧快照</p>',
    content_blocks: null,
  });

  await assert.rejects(
    () => service.updateItem(9, { name: '旧服务', content_blocks: { version: 1, blocks: [] } }),
    /请至少添加一个内容块/,
  );
  assert.equal(calls.updatePayloads.length, 0, '校验失败不应落库');
});

test('updateItem：操作日志只记录块摘要，不记录块全文', async () => {
  const { service, calls } = createServiceFixture({
    id: 9,
    name: '旧服务',
    is_deleted: 0,
    status: 1,
    display_zone: 0,
    content: '',
    content_blocks: null,
  });

  await service.updateItem(9, {
    name: '旧服务',
    content_blocks: { version: 1, blocks: [{ type: 'text', text: '正文关键词不应进日志' }] },
  });

  const log = calls.logs.find((entry) => entry.action === 'update');
  assert.ok(log, '应写入 update 日志');
  assert.equal(log.content.includes('正文关键词不应进日志'), false, '日志不应含块全文');
  assert.equal(JSON.parse(log.content).after.content.blocks_count, 1);
  assert.deepEqual(JSON.parse(log.content).after.content.block_types, ['text']);
});

// ============ ServiceService 读取逻辑 ============

test('getItem（后台）：content_blocks 解析为对象供编辑器回填', async () => {
  const { service } = createServiceFixture({
    id: 9,
    name: '旧服务',
    is_deleted: 0,
    content: '<p>快照</p>',
    content_blocks: '{"version":1,"blocks":[{"id":"b_1","type":"text","text":"回填"}]}',
  });

  const result = await service.getItem(9);
  assert.equal(typeof result.content_blocks, 'object');
  assert.equal(result.content_blocks.blocks[0].text, '回填');
});

test('getItem（后台）：脏块数据置 null 不抛错', async () => {
  const { service } = createServiceFixture({
    id: 9,
    name: '旧服务',
    is_deleted: 0,
    content: '纯文本',
    content_blocks: 'broken-json',
  });

  const result = await service.getItem(9);
  assert.equal(result.content_blocks, null);
  assert.equal(result.content, '纯文本', '历史纯文本 content 不受影响');
});

test('getItem（后台）：历史记录 content_blocks 为 null 时不报错', async () => {
  const { service } = createServiceFixture({
    id: 9,
    name: '历史服务',
    is_deleted: 0,
    content: '历史纯文本',
    content_blocks: null,
  });

  const result = await service.getItem(9);
  assert.equal(result.content_blocks, null);
});

test('publicGetItem（公开）：剥离 content_blocks，只返回 content 快照', async () => {
  const { service } = createServiceFixture({
    id: 9,
    name: '上架服务',
    is_deleted: 0,
    status: 1,
    content: '<p>快照</p>',
    content_blocks: '{"version":1,"blocks":[{"id":"b_1","type":"text","text":"内部数据"}]}',
  });

  const result = await service.publicGetItem(9);
  assert.equal('content_blocks' in result, false, '公开接口不应返回 content_blocks');
  assert.equal(result.content, '<p>快照</p>', '仍应返回 content 快照');
});

test('publicGetItem（公开）：已下架 / 已删除返回 404', async () => {
  const offShelf = createServiceFixture({ id: 9, is_deleted: 0, status: 0, content: 'x' });
  await assert.rejects(() => offShelf.service.publicGetItem(9), /该服务已下架/);

  const removed = createServiceFixture({ id: 9, is_deleted: 1, status: 1, content: 'x' });
  await assert.rejects(() => removed.service.publicGetItem(9), /服务不存在或已删除/);
});
