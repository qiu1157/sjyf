/**
 * 服务详情「块式内容」前端工具
 * 说明：类型与后端 backend/src/modules/service/content-blocks.util.ts 保持一致，
 *      校验以服务端为权威，前端此处只做「可输入范围内的即时约束」与默认值工厂。
 * 详细规则见 docs/specs/trae-specs/specs/service-content-block-editor/spec.md §3.2 / §3.3
 */

export type BlockType = 'heading' | 'text' | 'image' | 'imageGroup' | 'params' | 'guarantee';

export interface HeadingBlock {
  id: string;
  type: 'heading';
  text: string;
}
export interface TextBlock {
  id: string;
  type: 'text';
  text: string;
}
export interface ImageItem {
  url: string;
  caption?: string;
}
export interface ImageBlock {
  id: string;
  type: 'image';
  url: string;
  caption?: string;
}
export interface ImageGroupBlock {
  id: string;
  type: 'imageGroup';
  columns: 2 | 3;
  images: ImageItem[];
}
/** 历史兼容形态：自由文本「参数名 + 参数值」 */
export interface ParamItem {
  label: string;
  value: string;
}
/** 参数清单可绑定的服务档案字段键（受控词典，顺序即渲染顺序）（US-039） */
export type ParamKey = 'duration' | 'people_count' | 'area_max' | 'price_unit' | 'scope' | 'validity_days';
/** 参数清单条目：绑定字段（{key}）或历史手填（{label,value}）（US-039） */
export type ParamsItem = { key: ParamKey } | ParamItem;
export interface ParamsBlock {
  id: string;
  type: 'params';
  items: ParamsItem[];
}

/** 服务保障可选图标（lucide 名称白名单，与后端 GUARANTEE_ICON_NAMES 一致）（US-040） */
export const GUARANTEE_ICON_NAMES = [
  'shield-check',
  'badge-check',
  'clock',
  'user-check',
  'file-check',
  'heart-handshake',
  'wallet',
  'award',
  'sparkles',
  'repeat',
] as const;
export type GuaranteeIcon = (typeof GUARANTEE_ICON_NAMES)[number];

/** 服务保障项（US-040） */
export interface GuaranteeItem {
  icon: GuaranteeIcon;
  title: string;
  desc?: string;
}
export interface GuaranteeBlock {
  id: string;
  type: 'guarantee';
  items: GuaranteeItem[];
}

export type ContentBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | ImageGroupBlock
  | ParamsBlock
  | GuaranteeBlock;

export interface ContentBlocksPayload {
  version: 1;
  blocks: ContentBlock[];
}

// 与后端 §3.3 对齐的上限（前端提前拦截，避免用户白填后被服务端拒绝）
export const MAX_BLOCKS = 30;
export const MAX_IMAGES = 30;
// US-049：运营建议值，不是硬校验；用于提示图片化详情的推荐张数上限
export const RECOMMENDED_IMAGES = 18;
export const MAX_GROUP_IMAGES = 9;
export const MAX_PARAM_ITEMS = 12;
export const MAX_HEADING_LENGTH = 30;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_CAPTION_LENGTH = 30;
export const MAX_PARAM_LABEL_LENGTH = 20;
export const MAX_PARAM_VALUE_LENGTH = 50;
// 服务保障块约束（US-040，与后端 content-blocks.util.ts 保持一致）
export const MIN_GUARANTEE_ITEMS = 2;
export const MAX_GUARANTEE_ITEMS = 4;
export const MAX_GUARANTEE_TITLE_LENGTH = 8;
export const MAX_GUARANTEE_DESC_LENGTH = 20;

/** 生成块唯一 id（仅用于编辑器排序与 diff，不参与渲染） */
export function genBlockId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 6 种块的显示名与用途说明（图标由编辑器组件映射，保持本文件无框架依赖） */
export const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; description: string }> = {
  heading: { label: '小标题', description: '用于分段，如「服务包含」' },
  text: { label: '段落', description: '一段说明文字，支持换行' },
  image: { label: '单图', description: '一张大图，可加图注' },
  imageGroup: { label: '多图宫格', description: '2 列或 3 列图片墙，1-9 张' },
  params: { label: '参数清单', description: '键值对表格，如服务时长' },
  guarantee: { label: '服务保障', description: '图标 + 标题 + 说明，2-4 项' },
};

export const BLOCK_TYPES: BlockType[] = ['heading', 'text', 'image', 'imageGroup', 'params', 'guarantee'];

/** 新建保障块的默认图标序列（运营最常配置的三类保障） */
export const DEFAULT_GUARANTEE_ITEMS: GuaranteeIcon[] = ['shield-check', 'badge-check', 'clock'];

/** 各类型块的默认值工厂 */
export function createBlock(type: BlockType): ContentBlock {
  switch (type) {
    case 'heading':
      return { id: genBlockId(), type: 'heading', text: '' };
    case 'text':
      return { id: genBlockId(), type: 'text', text: '' };
    case 'image':
      return { id: genBlockId(), type: 'image', url: '', caption: '' };
    case 'imageGroup':
      return { id: genBlockId(), type: 'imageGroup', columns: 2, images: [{ url: '' }] };
    case 'params':
      // US-039：新建参数块默认绑定「服务时长」字段（值从服务档案继承，不再是自由文本）
      return { id: genBlockId(), type: 'params', items: [{ key: 'duration' }] };
    case 'guarantee':
      // US-040：默认 3 项（满足 2~4 项下限），图标取白名单前三个，标题留空待运营填写
      return { id: genBlockId(), type: 'guarantee', items: DEFAULT_GUARANTEE_ITEMS.map((icon) => ({ icon, title: '' })) };
  }
}

/** 把任意入参（对象 / JSON 字符串 / 脏数据）归一为块数组，供编辑器渲染 */
export function toBlocks(value: unknown): ContentBlock[] {
  let payload: unknown = value;
  if (typeof payload === 'string') {
    const text = payload.trim();
    if (!text) return [];
    try {
      payload = JSON.parse(text);
    } catch {
      return [];
    }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  const blocks = (payload as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return [];
  // 补齐缺失 id，避免拖拽 key 冲突
  return blocks
    .filter((block): block is ContentBlock => !!block && typeof block === 'object' && !Array.isArray(block))
    .map((block) => (block.id ? block : { ...block, id: genBlockId() }));
}

/** 统计块内的图片总数（image + imageGroup 内图片） */
export function countImages(blocks: ContentBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.type === 'image') return total + (block.url ? 1 : 0);
    if (block.type === 'imageGroup') return total + block.images.filter((image) => !!image.url).length;
    return total;
  }, 0);
}

/** 去除 HTML 标签与实体，得到纯文本（用于旧数据转换） */
function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 旧版纯文本 content → 1 个段落块（US-035）
 * 返回空数组表示「无需转换」（旧内容为空或无有效文本）
 */
export function parseLegacyContent(content?: string | null): ContentBlock[] {
  if (!content) return [];
  const text = stripHtml(content);
  if (!text) return [];
  return [{ id: genBlockId(), type: 'text', text: text.slice(0, MAX_TEXT_LENGTH) }];
}

/** 判断块数组是否「已填写完整」，用于提交前的友好提示 */
export function validateBlocks(blocks: ContentBlock[]): string | null {
  if (blocks.length === 0) return '请至少添加一个内容块';
  if (blocks.length > MAX_BLOCKS) return `内容块最多 ${MAX_BLOCKS} 个`;
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const prefix = `第 ${i + 1} 个块：`;
    if (block.type === 'heading' && !block.text.trim()) return `${prefix}请填写小标题`;
    if (block.type === 'text' && !block.text.trim()) return `${prefix}请填写段落内容`;
    if (block.type === 'image' && !block.url) return `${prefix}请上传图片`;
    if (block.type === 'imageGroup') {
      if (block.images.length === 0) return `${prefix}请上传 1-9 张图片`;
      if (block.images.some((image) => !image.url)) return `${prefix}有图片未上传完成`;
    }
    if (block.type === 'params') {
      if (block.items.length === 0) return `${prefix}参数条目需 1-12 条`;
      // 仅历史手填项需要校验填写完整；绑定字段项的值来自服务档案，无需在此校验
      const legacyItems = block.items.filter((item): item is ParamItem => 'label' in item);
      if (legacyItems.some((item) => !item.label.trim() || !item.value.trim())) {
        return `${prefix}参数名与参数值需填写完整`;
      }
    }
    if (block.type === 'guarantee') {
      if (block.items.length < MIN_GUARANTEE_ITEMS || block.items.length > MAX_GUARANTEE_ITEMS) {
        return `${prefix}服务保障需 ${MIN_GUARANTEE_ITEMS}-${MAX_GUARANTEE_ITEMS} 项`;
      }
      if (block.items.some((item) => !item.title.trim())) return `${prefix}请填写保障标题`;
      if (block.items.some((item) => item.title.trim().length > MAX_GUARANTEE_TITLE_LENGTH)) {
        return `${prefix}保障标题最多 ${MAX_GUARANTEE_TITLE_LENGTH} 字`;
      }
      if (block.items.some((item) => (item.desc ?? '').trim().length > MAX_GUARANTEE_DESC_LENGTH)) {
        return `${prefix}保障说明最多 ${MAX_GUARANTEE_DESC_LENGTH} 字`;
      }
    }
  }
  if (countImages(blocks) > MAX_IMAGES) return `内容块图片总数最多 ${MAX_IMAGES} 张`;
  return null;
}

// ============ US-039：参数清单「绑定字段」派生规则（前端唯一实现，编辑器与预览共用） ============

/** 参数清单字段键的固定顺序（与后端 content-blocks.util.ts 的 PARAM_KEY_ORDER 一致） */
export const PARAM_KEY_ORDER: ParamKey[] = [
  'duration',
  'people_count',
  'area_max',
  'price_unit',
  'scope',
  'validity_days',
];

/** 字段键 → 中文标签（与后端 PARAM_KEY_LABELS 一致） */
export const PARAM_KEY_LABELS: Record<ParamKey, string> = {
  duration: '服务时长',
  people_count: '服务人数',
  area_max: '适用面积',
  price_unit: '计价方式',
  scope: '服务地域',
  validity_days: '服务期限',
};

/** 计价方式枚举文案（与后端 PRICE_UNIT_LABELS 一致） */
export const PRICE_UNIT_LABELS: Record<number, string> = {
  1: '按次一口价',
  2: '按小时计费',
  3: '按平方米计费',
  4: '按人天计费',
  5: '面议',
};

/** 服务档案字段值来源（宽松，供派生规则读取） */
export interface ParamFieldValues {
  duration?: number | string | null;
  people_count?: number | string | null;
  area_max?: number | string | null;
  price_unit?: number | string | null;
  scope?: string | null;
  validity_days?: number | string | null;
}

/** 弱类型数字转「正数」：空 / 非数字 / ≤0 → null（视为未填写） */
function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

/** 判断某档案字段是否已填写（用于「该字段未填写」提示） */
export function isParamFieldFilled(key: ParamKey, source: ParamFieldValues): boolean {
  if (key === 'scope') return typeof source.scope === 'string' && source.scope.trim() !== '';
  return toPositiveNumber(source[key]) !== null;
}

/**
 * 从表单全量值中抽取「参数清单」可绑定的 6 个档案字段，作为 Form.useWatch 的选择器使用。
 * 注意：Form.useWatch 的首参是「单个字段路径」，直接传字段名数组会被当成嵌套路径读取而取值为空；
 * 用选择器函数既能取到 6 个字段，又只在这 6 个字段变化时才触发重渲染（避免无关字段输入时反复刷新参数块）。
 */
export function selectParamFieldValues(values: Record<string, unknown> | null | undefined): ParamFieldValues {
  const picked = {} as Record<ParamKey, unknown>;
  for (const key of PARAM_KEY_ORDER) picked[key] = values ? values[key] : undefined;
  return picked as ParamFieldValues;
}

/**
 * US-039：单个字段键 → 展示行（{label, value}）
 * 派生规则与后端 buildDetailSections 保持一致（后端另有一份实现，用于 detail_sections 投影）
 */
export function deriveParamRow(key: ParamKey, source: ParamFieldValues): { label: string; value: string } {
  switch (key) {
    case 'duration': {
      const n = toPositiveNumber(source.duration);
      return { label: PARAM_KEY_LABELS.duration, value: n === null ? '—' : n % 60 === 0 && n >= 60 ? `${n / 60} 小时` : `${n} 分钟` };
    }
    case 'people_count': {
      const n = toPositiveNumber(source.people_count);
      return { label: PARAM_KEY_LABELS.people_count, value: n === null ? '不限' : `最多 ${n} 人` };
    }
    case 'area_max': {
      const n = toPositiveNumber(source.area_max);
      return { label: PARAM_KEY_LABELS.area_max, value: n === null ? '不限' : `${n}㎡ 以内` };
    }
    case 'price_unit': {
      const n = toPositiveNumber(source.price_unit);
      return { label: PARAM_KEY_LABELS.price_unit, value: (n !== null && PRICE_UNIT_LABELS[n]) || '面议' };
    }
    case 'scope': {
      const s = typeof source.scope === 'string' ? source.scope.trim() : '';
      return { label: PARAM_KEY_LABELS.scope, value: s || '到店咨询' };
    }
    case 'validity_days': {
      const n = toPositiveNumber(source.validity_days);
      return { label: PARAM_KEY_LABELS.validity_days, value: n === null ? '长期有效' : `下单后 ${n} 天内有效` };
    }
  }
}

/** 判断条目是否为「绑定字段」形态 */
export function isKeyedParamItem(item: ParamsItem): item is { key: ParamKey } {
  return 'key' in item;
}

/** 用 label 文本匹配白名单字段（历史手填项一键升级时用于预选） */
export function matchParamKeyByLabel(label: string): ParamKey | null {
  const text = (label || '').trim();
  return PARAM_KEY_ORDER.find((key) => PARAM_KEY_LABELS[key] === text) ?? null;
}

/**
 * US-039：参数清单最终展示行（手机预览用，与小程序详情页一致）
 * - 绑定字段项按白名单固定顺序在前，值实时派生自服务档案
 * - 历史手填项按原顺序追加在后
 */
export function summarizeParamsItems(
  items: ParamsItem[],
  source: ParamFieldValues,
): { label: string; value: string }[] {
  const presentKeys = new Set<ParamKey>();
  const legacy: ParamItem[] = [];
  for (const item of items) {
    if (isKeyedParamItem(item)) presentKeys.add(item.key);
    else if (item && typeof item === 'object') legacy.push(item);
  }
  const rows: { label: string; value: string }[] = [];
  for (const key of PARAM_KEY_ORDER) if (presentKeys.has(key)) rows.push(deriveParamRow(key, source));
  for (const item of legacy) rows.push({ label: item.label, value: item.value });
  return rows;
}

/** 内容模板（US-037）：一键套用，覆盖当前块内容 */
export interface ContentTemplate {
  key: string;
  name: string;
  summary: string;
  build: () => ContentBlock[];
}

/** 模板中书写块时的「无 id」形态 */
type BlockDraft =
  | Omit<HeadingBlock, 'id'>
  | Omit<TextBlock, 'id'>
  | Omit<ImageBlock, 'id'>
  | Omit<ImageGroupBlock, 'id'>
  | Omit<ParamsBlock, 'id'>
  | Omit<GuaranteeBlock, 'id'>;

/** 内部小工具：批量生成块（自动补唯一 id） */
function buildBlocks(list: BlockDraft[]): ContentBlock[] {
  return list.map((block) => ({ ...block, id: genBlockId() }) as ContentBlock);
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    key: 'standard-cleaning',
    name: '标准保洁',
    summary: '日常家庭保洁，含清洁范围、服务流程与温馨提示',
    build: () =>
      buildBlocks([
        { type: 'heading', text: '服务包含' },
        {
          type: 'text',
          text: '客厅、卧室、厨房、卫生间地面与台面清洁，家具表面除尘，垃圾清运。\n不含：高空外墙、家电内部拆洗、地板打蜡。',
        },
        {
          type: 'params',
          items: [
            { label: '服务时长', value: '2 小时' },
            { label: '服务人数', value: '1 人' },
            { label: '适用面积', value: '90㎡ 以内' },
          ],
        },
        { type: 'heading', text: '服务流程' },
        { type: 'text', text: '① 预约下单 → ② 服务人员上门 → ③ 按标准清洁 → ④ 现场验收确认' },
        { type: 'heading', text: '温馨提示' },
        { type: 'text', text: '如需增加服务时长，请提前与服务人员沟通；服务结束后请现场确认清洁结果。' },
      ]),
  },
  {
    key: 'deep-cleaning',
    name: '深度保洁',
    summary: '全屋深度清洁，含厨房油污、卫生间水垢等死角处理',
    build: () =>
      buildBlocks([
        { type: 'heading', text: '服务包含' },
        {
          type: 'text',
          text: '全屋深度清洁：厨房油污与灶台、卫生间水垢与地漏、玻璃内侧、踢脚线、门框与开关面板等死角。\n不含：外墙玻璃、吊顶高处、家电拆洗。',
        },
        {
          type: 'params',
          items: [
            { label: '服务时长', value: '4 小时' },
            { label: '服务人数', value: '2 人' },
            { label: '适用面积', value: '120㎡ 以内' },
          ],
        },
        { type: 'heading', text: '服务流程' },
        {
          type: 'text',
          text: '① 现场确认清洁范围 → ② 分区深度清洁 → ③ 重点部位二次处理 → ④ 业主验收签字',
        },
        { type: 'heading', text: '温馨提示' },
        {
          type: 'text',
          text: '深度保洁耗时较长，请提前预留时间；如需清洗家电，请在下单时备注，另行报价。',
        },
      ]),
  },
  {
    key: 'organizing',
    name: '收纳整理',
    summary: '物品分类归位与收纳建议，含流程与注意事项',
    build: () =>
      buildBlocks([
        { type: 'heading', text: '服务包含' },
        {
          type: 'text',
          text: '衣物分类折叠与分季归位、儿童玩具分类收纳、厨房餐具与调料归位、杂物分类与标识。\n不含：收纳用品采购费用、家具拆装。',
        },
        {
          type: 'params',
          items: [
            { label: '服务时长', value: '3 小时' },
            { label: '服务人数', value: '1 人' },
            { label: '建议准备', value: '收纳箱、标签贴纸' },
          ],
        },
        { type: 'heading', text: '服务流程' },
        { type: 'text', text: '① 沟通整理需求 → ② 物品清点分类 → ③ 分区归位收纳 → ④ 交付使用说明' },
        { type: 'heading', text: '温馨提示' },
        { type: 'text', text: '请提前取出贵重物品与私密物品；整理方案以「取用方便、易于维持」为原则。' },
      ]),
  },
];

/** US-049：图片化详情模板，强调主视觉 + 场景图 + 结构化区分层 */
export const IMAGE_CONTENT_TEMPLATE: ContentTemplate = {
  key: 'image-first-detail',
  name: '图片化详情',
  summary: '适合家政服务的强视觉详情页骨架，先图片表达，再补结构化信息',
  build: () =>
    buildBlocks([
      { type: 'heading', text: '服务亮点' },
      { type: 'image', url: '', caption: '主视觉图（建议 4:3 或 3:4）' },
      {
        type: 'text',
        text: '请在这里补充 1-3 行卖点说明，例如适用场景、服务效果或作业重点。',
      },
      {
        type: 'imageGroup',
        columns: 2,
        images: [
          { url: '', caption: '场景图 1' },
          { url: '', caption: '场景图 2' },
        ],
      },
      {
        type: 'text',
        text: '服务流程：\n1. 上门确认作业范围\n2. 分区处理重点区域\n3. 现场复核并交付说明',
      },
      {
        type: 'guarantee',
        items: [
          { icon: 'shield-check', title: '身份核验', desc: '服务人员实名可追溯' },
          { icon: 'badge-check', title: '标准执行', desc: '按既定流程作业' },
          { icon: 'clock', title: '准时上门', desc: '按预约时间到场' },
        ],
      },
      {
        type: 'text',
        text: '服务范围与不含项：\n包含：请补充本次服务包含的核心内容。\n不含：请补充不在服务范围内的项目。',
      },
      {
        type: 'params',
        items: [{ key: 'duration' }, { key: 'scope' }, { key: 'price_unit' }],
      },
    ]),
};
