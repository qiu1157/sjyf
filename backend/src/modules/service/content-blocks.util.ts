import { BadRequestException } from '@nestjs/common';

/**
 * 服务内容块（块式详情编排）
 * 说明：块结构是「详情」的唯一真身（JSON），保存时由服务端生成 HTML 快照写入 content。
 * 详细规则见 docs/specs/trae-specs/specs/service-content-block-editor/spec.md §3.3 / §5.3
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
/** 历史兼容形态：自由文本「参数名 + 参数值」 */
export interface ParamItem {
  label: string;
  value: string;
}
/** 参数清单可绑定的服务档案字段键（受控词典，顺序即渲染顺序）（US-039） */
export type ParamKey = 'duration' | 'people_count' | 'area_max' | 'price_unit' | 'scope' | 'validity_days';
export const PARAM_KEY_ORDER: readonly ParamKey[] = [
  'duration',
  'people_count',
  'area_max',
  'price_unit',
  'scope',
  'validity_days',
];
const PARAM_KEY_SET: ReadonlySet<string> = new Set(PARAM_KEY_ORDER);
/** 参数清单条目：绑定字段（{key}）或历史手填（{label,value}）（US-039） */
export type ParamsItem = { key: ParamKey } | ParamItem;
export interface ParamsBlock {
  id: string;
  type: 'params';
  items: ParamsItem[];
}

export type ContentBlock = HeadingBlock | TextBlock | ImageBlock | ImageGroupBlock | ParamsBlock;

export interface ContentBlocksPayload {
  version: 1;
  blocks: ContentBlock[];
}

// 结构化块类型白名单（本期仅参数表 params）：此类块不进 HTML 快照，改由公开详情的 detail_sections 原生渲染，避免重复
export const STRUCTURED_BLOCK_TYPES = ['params'] as const;
const STRUCTURED_BLOCK_TYPE_SET: ReadonlySet<BlockType> = new Set(STRUCTURED_BLOCK_TYPES);

// 约束上限（与 spec §3.3 保持一致）
const MAX_BLOCKS = 30;
const MAX_IMAGES = 30;
const MAX_HTML_BYTES = 200 * 1024;

/** 生成块唯一 id（仅用于编辑器排序与 diff，不参与渲染） */
function genBlockId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** HTML 转义，防止注入（快照直接渲染到小程序端） */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 抛出带「第 N 个块：」前缀的校验错误 */
function blockError(index: number, message: string): never {
  throw new BadRequestException(`第 ${index + 1} 个块：${message}`);
}

/**
 * 校验并规范化块数据（服务端权威）
 * - 入参兼容 JSON 对象 / JSON 字符串
 * - null / undefined / 空字符串 → 返回 null，表示「本次不处理块」（保留旧 content）
 * - 结构非法 / blocks 为空数组 → 抛 BadRequestException
 * - 未知块类型直接报错，不静默丢弃
 */
export function normalizeBlocks(raw: unknown): ContentBlocksPayload | null {
  if (raw === null || raw === undefined) return null;

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (text === '') return null;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestException('内容块数据格式不正确');
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('内容块数据格式不正确');
  }

  const blocksRaw = (parsed as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocksRaw)) throw new BadRequestException('内容块数据格式不正确');
  if (blocksRaw.length === 0) throw new BadRequestException('请至少添加一个内容块');
  if (blocksRaw.length > MAX_BLOCKS) throw new BadRequestException('内容块最多 30 个');

  let imageTotal = 0;
  const blocks: ContentBlock[] = blocksRaw.map((rawBlock, index) => {
    if (!rawBlock || typeof rawBlock !== 'object' || Array.isArray(rawBlock)) {
      blockError(index, '内容块格式不正确');
    }
    const block = rawBlock as Record<string, any>;
    const id = typeof block.id === 'string' && block.id.trim() ? block.id : genBlockId();

    switch (block.type) {
      case 'heading': {
        const text = asString(block.text).trim();
        if (text.length < 1 || text.length > 30) blockError(index, '小标题需 1-30 字符');
        return { id, type: 'heading', text };
      }
      case 'text': {
        const text = asString(block.text);
        if (text.trim().length < 1 || text.length > 2000) blockError(index, '段落内容需 1-2000 字符');
        return { id, type: 'text', text };
      }
      case 'image': {
        const url = asString(block.url).trim();
        if (!url) blockError(index, '请上传图片');
        imageTotal += 1;
        const caption = asString(block.caption).trim();
        if (caption.length > 30) blockError(index, '图注最多 30 字符');
        const result: ImageBlock = { id, type: 'image', url };
        if (caption) result.caption = caption;
        return result;
      }
      case 'imageGroup': {
        const imagesRaw = block.images;
        if (!Array.isArray(imagesRaw) || imagesRaw.length < 1 || imagesRaw.length > 9) {
          blockError(index, '请上传 1-9 张图片');
        }
        const images: ImageItem[] = imagesRaw.map((rawImage: any) => {
          const url = asString(rawImage?.url).trim();
          if (!url) blockError(index, '请上传图片');
          const caption = asString(rawImage?.caption).trim();
          if (caption.length > 30) blockError(index, '图注最多 30 字符');
          const item: ImageItem = { url };
          if (caption) item.caption = caption;
          return item;
        });
        imageTotal += images.length;
        const columns: 2 | 3 = block.columns === 3 ? 3 : 2;
        return { id, type: 'imageGroup', columns, images };
      }
      case 'params': {
        const itemsRaw = block.items;
        if (!Array.isArray(itemsRaw) || itemsRaw.length < 1 || itemsRaw.length > 12) {
          blockError(index, '参数条目需 1-12 条');
        }
        const seenKeys = new Set<string>();
        const items: ParamsItem[] = itemsRaw.map((rawItem: any) => {
          // US-039 新形态：只存服务档案字段键，值与标签由服务端从结构化字段派生
          if (rawItem && typeof rawItem === 'object' && !Array.isArray(rawItem) && 'key' in rawItem) {
            const key = asString(rawItem.key).trim();
            if (!PARAM_KEY_SET.has(key)) blockError(index, '参数字段不在允许范围内');
            if (seenKeys.has(key)) blockError(index, '同一参数字段不可重复添加');
            seenKeys.add(key);
            return { key: key as ParamKey };
          }
          // 历史兼容形态：自由文本键值对（校验规则保持不变）
          const label = asString(rawItem?.label).trim();
          const value = asString(rawItem?.value).trim();
          if (label.length < 1 || label.length > 20) blockError(index, '参数名需 1-20 字符');
          if (value.length < 1 || value.length > 50) blockError(index, '参数值需 1-50 字符');
          return { label, value };
        });
        return { id, type: 'params', items };
      }
      default:
        blockError(index, `不支持的块类型 ${block.type}`);
    }
  });

  if (imageTotal > MAX_IMAGES) throw new BadRequestException('内容块图片总数最多 30 张');
  return { version: 1, blocks };
}

/**
 * 由块数据生成内联样式 HTML 快照（小程序端 mp-html 渲染用）
 * 要点：内联 style（mp-html 无法可靠继承外部 CSS）；多图宫格用 flex-wrap（避开小程序 grid 兼容坑）
 */
export function renderBlocksToHtml(payload: ContentBlocksPayload): string {
  const parts: string[] = [];

  for (const block of payload.blocks) {
    // 结构化块（如参数表）不进 HTML 快照：由公开详情接口的 detail_sections 原生渲染，避免重复展示
    if (STRUCTURED_BLOCK_TYPE_SET.has(block.type)) continue;
    switch (block.type) {
      case 'heading':
        parts.push(
          `<h3 style="margin:18px 0 10px;padding-left:10px;border-left:3px solid #B76E45;font-size:16px;font-weight:600;line-height:1.5;color:#2B2018;">${escapeHtml(block.text)}</h3>`,
        );
        break;
      case 'text':
        parts.push(
          `<p style="margin:0 0 12px;font-size:14px;line-height:1.8;color:#4A4038;">${escapeHtml(block.text).replace(/\n/g, '<br/>')}</p>`,
        );
        break;
      case 'image':
        parts.push(
          `<p style="margin:0 0 12px;"><img src="${escapeHtml(block.url)}" style="width:100%;display:block;border-radius:8px;"/></p>`,
        );
        if (block.caption) {
          parts.push(
            `<p style="margin:-6px 0 12px;font-size:12px;color:#9A8F86;text-align:center;">${escapeHtml(block.caption)}</p>`,
          );
        }
        break;
      case 'imageGroup': {
        const width = block.columns === 3 ? '33.33%' : '50%';
        const cells = block.images
          .map((image) => {
            const caption = image.caption
              ? `<p style="margin:4px 0 0;font-size:12px;color:#9A8F86;text-align:center;">${escapeHtml(image.caption)}</p>`
              : '';
            return `<div style="width:${width};box-sizing:border-box;padding:4px;"><img src="${escapeHtml(image.url)}" style="width:100%;display:block;border-radius:8px;"/>${caption}</div>`;
          })
          .join('');
        parts.push(`<div style="display:flex;flex-wrap:wrap;margin:0 -4px 12px;">${cells}</div>`);
        break;
      }
      case 'params': {
        // 不可达：params 属结构化块，已在循环开头被跳过（保留历史渲染逻辑，不清理）
        const rows = (block.items as ParamItem[])
          .map(
            (item) =>
              `<tr><td style="padding:8px 10px;background:#FAF6F1;color:#8A7F76;width:38%;border-bottom:1px solid #F0E9E0;">${escapeHtml(item.label)}</td><td style="padding:8px 10px;color:#2B2018;border-bottom:1px solid #F0E9E0;">${escapeHtml(item.value)}</td></tr>`,
          )
          .join('');
        parts.push(
          `<table style="width:100%;border-collapse:collapse;margin:0 0 12px;font-size:13px;">${rows}</table>`,
        );
        break;
      }
    }
  }

  const html = parts.join('');
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    throw new BadRequestException('详情内容过长，请精简');
  }
  return html;
}

/**
 * 安全解析已落库的块数据（不抛错，解析失败返回 null）
 * 用于后台编辑接口回填；脏数据不应卡死编辑
 */
export function parseStoredBlocks(raw: unknown): ContentBlocksPayload | null {
  if (raw === null || raw === undefined) return null;
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (text === '') return null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).blocks)) return null;
  return { version: 1, blocks: (parsed as any).blocks };
}

/** 生成操作日志用的块摘要（不记录全文，避免日志膨胀） */
export function summarizeBlocks(raw: unknown): { blocks_count: number; block_types: string[] } {
  const payload = parseStoredBlocks(raw);
  if (!payload) return { blocks_count: 0, block_types: [] };
  return {
    blocks_count: payload.blocks.length,
    block_types: Array.from(new Set(payload.blocks.map((block) => block.type))),
  };
}

// ============ 服务档案结构化（US-038：detail_sections 派生投影） ============

/** 服务方式枚举文案 */
export const SERVICE_MODE_LABELS: Record<number, string> = {
  1: '上门服务',
  2: '到店服务',
  3: '上门/到店均可',
};

/** 计价方式枚举文案 */
export const PRICE_UNIT_LABELS: Record<number, string> = {
  1: '按次一口价',
  2: '按小时计费',
  3: '按平方米计费',
  4: '按人天计费',
  5: '面议',
};

/** detail_sections 单行参数 */
export interface DetailSectionParam {
  label: string;
  value: string;
}

/** 只读渲染视图：小程序原生渲染参数表用 */
export interface DetailSections {
  has_structured_content: boolean;
  params: DetailSectionParam[];
}

/** 结构化字段来源（宽松接口，避免 import 实体造成循环依赖） */
export interface StructuredFieldSource {
  duration?: number | string | null;
  people_count?: number | string | null;
  area_max?: number | string | null;
  price_unit?: number | string | null;
  scope?: string | null;
  validity_days?: number | string | null;
  service_mode?: number | string | null;
  content_blocks?: unknown;
}

/** 弱类型数字转「正数」：字符串数字可识别；非数字 / ≤0 / 空 一律视为未填写（null） */
function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

/** 已落库块数据中是否含结构化块（如参数表） */
function hasStructuredContentBlock(raw: unknown): boolean {
  const payload = parseStoredBlocks(raw);
  if (!payload) return false;
  return payload.blocks.some((block) => STRUCTURED_BLOCK_TYPE_SET.has(block.type));
}

/** 参数清单字段键 → 派生标签（与前端 admin/src/utils/contentBlocks.ts 的 PARAM_KEY_LABELS 一致） */
const PARAM_KEY_LABELS: Record<ParamKey, string> = {
  duration: '服务时长',
  people_count: '服务人数',
  area_max: '适用面积',
  price_unit: '计价方式',
  scope: '服务地域',
  validity_days: '服务期限',
};

/** 服务档案派生上下文（已归一化：数字为 null 表示未填写） */
interface ParamDeriveContext {
  duration: number | null;
  peopleCount: number | null;
  areaMax: number | null;
  priceUnit: number | null;
  scope: string;
  validityDays: number | null;
}

/**
 * US-039：单个参数键 → 展示行。派生规则沿用 US-038，仅做「按需输出」。
 * 说明：前端 admin/src/utils/contentBlocks.ts 的 deriveParamRow 为同规则的另一份实现（前后端各需一份，无法共享代码）。
 * duration 为空时沿用 US-038 的「跳过整行」语义（返回 null）。
 */
function deriveParamRow(key: ParamKey, ctx: ParamDeriveContext): DetailSectionParam | null {
  switch (key) {
    case 'duration':
      if (ctx.duration === null) return null;
      return {
        label: PARAM_KEY_LABELS.duration,
        value: ctx.duration % 60 === 0 && ctx.duration >= 60 ? `${ctx.duration / 60} 小时` : `${ctx.duration} 分钟`,
      };
    case 'people_count':
      return { label: PARAM_KEY_LABELS.people_count, value: ctx.peopleCount !== null ? `最多 ${ctx.peopleCount} 人` : '不限' };
    case 'area_max':
      return { label: PARAM_KEY_LABELS.area_max, value: ctx.areaMax !== null ? `${ctx.areaMax}㎡ 以内` : '不限' };
    case 'price_unit':
      return { label: PARAM_KEY_LABELS.price_unit, value: ctx.priceUnit !== null ? PRICE_UNIT_LABELS[ctx.priceUnit] || '面议' : '面议' };
    case 'scope':
      return { label: PARAM_KEY_LABELS.scope, value: ctx.scope || '到店咨询' };
    case 'validity_days':
      return { label: PARAM_KEY_LABELS.validity_days, value: ctx.validityDays !== null ? `下单后 ${ctx.validityDays} 天内有效` : '长期有效' };
  }
}

/** 取块数据中的第一个 params 块（US-039：只有存在 params 块才输出参数行） */
function findParamsBlock(raw: unknown): ParamsBlock | null {
  const payload = parseStoredBlocks(raw);
  if (!payload) return null;
  return (payload.blocks.find((block) => block.type === 'params') as ParamsBlock | undefined) ?? null;
}

/**
 * US-039：由 params 块条目 + 服务档案派生参数行
 * - {key} 项：按白名单固定顺序输出（与运营添加先后无关）
 * - 历史 {label,value} 项：原样、按素材原顺序追加在尾部
 */
function buildParamsRows(items: ParamsItem[], ctx: ParamDeriveContext): DetailSectionParam[] {
  const presentKeys = new Set<ParamKey>();
  const legacy: ParamItem[] = [];
  for (const item of items) {
    if (item && typeof item === 'object' && 'key' in item) {
      presentKeys.add((item as { key: ParamKey }).key);
    } else if (item && typeof item === 'object') {
      legacy.push(item as ParamItem);
    }
  }
  const rows: DetailSectionParam[] = [];
  for (const key of PARAM_KEY_ORDER) {
    if (!presentKeys.has(key)) continue;
    const row = deriveParamRow(key, ctx);
    if (row) rows.push(row);
  }
  for (const item of legacy) rows.push({ label: item.label, value: item.value });
  return rows;
}

/**
 * 由服务档案派生只读渲染视图 detail_sections（纯计算，不抛错）
 * - has_structured_content：结构化字段任一有值，或 content_blocks 含结构化块；
 *   legacy 字段 duration / scope 单独有值不算（保证存量服务零回归）—— 此定义自 US-038 起保持不变
 * - US-039 行为演进：params 改为「只输出 params 块中已添加的字段行」；无 params 块时 params = []
 *   （US-038 时期为「只要结构化字段有值就恒输出 6 行」，本次已废弃）
 */
export function buildDetailSections(item: StructuredFieldSource): DetailSections {
  const ctx: ParamDeriveContext = {
    duration: toPositiveNumber(item.duration),
    peopleCount: toPositiveNumber(item.people_count),
    areaMax: toPositiveNumber(item.area_max),
    priceUnit: toPositiveNumber(item.price_unit),
    scope: typeof item.scope === 'string' ? item.scope.trim() : '',
    validityDays: toPositiveNumber(item.validity_days),
  };
  const serviceMode = toPositiveNumber(item.service_mode);

  const hasStructuredField =
    serviceMode !== null ||
    ctx.peopleCount !== null ||
    ctx.areaMax !== null ||
    ctx.priceUnit !== null ||
    ctx.validityDays !== null;
  if (!hasStructuredField && !hasStructuredContentBlock(item.content_blocks)) {
    return { has_structured_content: false, params: [] };
  }

  const paramsBlock = findParamsBlock(item.content_blocks);
  if (!paramsBlock) return { has_structured_content: true, params: [] };
  return { has_structured_content: true, params: buildParamsRows(paramsBlock.items, ctx) };
}
