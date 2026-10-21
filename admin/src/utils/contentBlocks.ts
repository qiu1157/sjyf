/**
 * 服务详情「块式内容」前端工具
 * 说明：类型与后端 backend/src/modules/service/content-blocks.util.ts 保持一致，
 *      校验以服务端为权威，前端此处只做「可输入范围内的即时约束」与默认值工厂。
 * 详细规则见 docs/specs/trae-specs/specs/service-content-block-editor/spec.md §3.2 / §3.3
 */

export type BlockType = 'heading' | 'text' | 'image' | 'imageGroup' | 'params';

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
export interface ParamItem {
  label: string;
  value: string;
}
export interface ParamsBlock {
  id: string;
  type: 'params';
  items: ParamItem[];
}

export type ContentBlock = HeadingBlock | TextBlock | ImageBlock | ImageGroupBlock | ParamsBlock;

export interface ContentBlocksPayload {
  version: 1;
  blocks: ContentBlock[];
}

// 与后端 §3.3 对齐的上限（前端提前拦截，避免用户白填后被服务端拒绝）
export const MAX_BLOCKS = 30;
export const MAX_IMAGES = 30;
export const MAX_GROUP_IMAGES = 9;
export const MAX_PARAM_ITEMS = 12;
export const MAX_HEADING_LENGTH = 30;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_CAPTION_LENGTH = 30;
export const MAX_PARAM_LABEL_LENGTH = 20;
export const MAX_PARAM_VALUE_LENGTH = 50;

/** 生成块唯一 id（仅用于编辑器排序与 diff，不参与渲染） */
export function genBlockId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 5 种块的显示名与用途说明（图标由编辑器组件映射，保持本文件无框架依赖） */
export const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; description: string }> = {
  heading: { label: '小标题', description: '用于分段，如「服务包含」' },
  text: { label: '段落', description: '一段说明文字，支持换行' },
  image: { label: '单图', description: '一张大图，可加图注' },
  imageGroup: { label: '多图宫格', description: '2 列或 3 列图片墙，1-9 张' },
  params: { label: '参数清单', description: '键值对表格，如服务时长' },
};

export const BLOCK_TYPES: BlockType[] = ['heading', 'text', 'image', 'imageGroup', 'params'];

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
      return { id: genBlockId(), type: 'params', items: [{ label: '', value: '' }] };
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
      if (block.items.some((item) => !item.label.trim() || !item.value.trim())) {
        return `${prefix}参数名与参数值需填写完整`;
      }
    }
  }
  if (countImages(blocks) > MAX_IMAGES) return `内容块图片总数最多 ${MAX_IMAGES} 张`;
  return null;
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
  | Omit<ParamsBlock, 'id'>;

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
