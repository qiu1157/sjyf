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
        const items: ParamItem[] = itemsRaw.map((rawItem: any) => {
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
        const rows = block.items
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
