import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Modal, Space, Tooltip, message } from 'antd';
import {
  AlignLeftOutlined,
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DownOutlined,
  FontSizeOutlined,
  HolderOutlined,
  PictureOutlined,
  PlusOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import HeadingBlockEditor from './blocks/HeadingBlockEditor';
import TextBlockEditor from './blocks/TextBlockEditor';
import ImageBlockEditor from './blocks/ImageBlockEditor';
import ImageGroupBlockEditor from './blocks/ImageGroupBlockEditor';
import ParamsBlockEditor from './blocks/ParamsBlockEditor';
import GuaranteeBlockEditor from './blocks/GuaranteeBlockEditor';
import ServiceContentPreview from './ServiceContentPreview';
import { colors } from '../theme';
import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES,
  CONTENT_TEMPLATES,
  MAX_BLOCKS,
  createBlock,
  parseLegacyContent,
  toBlocks,
  type BlockType,
  type ContentBlock,
  type ContentBlocksPayload,
} from '../utils/contentBlocks';

interface ServiceContentEditorProps {
  /** 编辑时由后端 content_blocks 回填（对象或 JSON 字符串均可） */
  value?: ContentBlocksPayload | null;
  onChange?: (value: ContentBlocksPayload) => void;
  /** 旧版纯文本 content，用于 US-035 自动转换 */
  legacyContent?: string;
}

const TYPE_ICONS: Record<BlockType, React.ReactNode> = {
  heading: <FontSizeOutlined />,
  text: <AlignLeftOutlined />,
  image: <PictureOutlined />,
  imageGroup: <AppstoreOutlined />,
  params: <ProfileOutlined />,
  guarantee: <SafetyCertificateOutlined />,
};

const TYPE_TAG_COLOR: Record<BlockType, string> = {
  heading: '#B76E45',
  text: '#5A84A8',
  image: '#5B8C5A',
  imageGroup: '#8A6BA8',
  params: '#D99A3D',
  guarantee: colors.primary700,
};

/** 按块类型分发到对应的编辑子组件 */
function BlockEditorSwitch({
  block,
  onChange,
}: {
  block: ContentBlock;
  onChange: (next: ContentBlock) => void;
}) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlockEditor block={block} onChange={onChange} />;
    case 'text':
      return <TextBlockEditor block={block} onChange={onChange} />;
    case 'image':
      return <ImageBlockEditor block={block} onChange={onChange} />;
    case 'imageGroup':
      return <ImageGroupBlockEditor block={block} onChange={onChange} />;
    case 'params':
      return <ParamsBlockEditor block={block} onChange={onChange} />;
    case 'guarantee':
      return <GuaranteeBlockEditor block={block} onChange={onChange} />;
  }
}

interface SortableBlockCardProps {
  block: ContentBlock;
  index: number;
  total: number;
  onChange: (next: ContentBlock) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

/** 单个块卡片：拖拽手柄 + 类型标签 + 上移/下移/删除 + 类型专属编辑区 */
const SortableBlockCard = memo(
  function SortableBlockCard({
    block,
    index,
    total,
    onChange,
    onRemove,
    onMove,
  }: SortableBlockCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: block.id,
    });
    const info = BLOCK_TYPE_LABELS[block.type];

    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.7 : 1,
          border: `1px solid ${isDragging ? '#B76E45' : '#F0E9E0'}`,
          borderRadius: 8,
          background: '#fff',
          marginBottom: 12,
          boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderBottom: '1px solid #F5F2EC',
            background: '#FCFAF7',
            borderRadius: '8px 8px 0 0',
          }}
        >
          {/* 拖拽手柄：仅此处绑定拖拽事件，避免与内部输入框冲突 */}
          <Tooltip title="按住拖动排序">
            <span
              {...attributes}
              {...listeners}
              style={{
                cursor: 'grab',
                color: '#B8A78C',
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 2px',
                touchAction: 'none',
              }}
            >
              <HolderOutlined />
            </span>
          </Tooltip>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 4,
              color: '#fff',
              background: TYPE_TAG_COLOR[block.type],
            }}
          >
            {info.label}
          </span>
          <span style={{ fontSize: 12, color: '#9A8F86' }}>第 {index + 1} 块</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
            <Button
              size="small"
              type="text"
              icon={<ArrowUpOutlined />}
              disabled={index === 0}
              onClick={() => onMove(block.id, -1)}
            />
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              disabled={index === total - 1}
              onClick={() => onMove(block.id, 1)}
            />
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onRemove(block.id)}
            />
          </span>
        </div>
        <div style={{ padding: 12 }}>
          <BlockEditorSwitch block={block} onChange={onChange} />
        </div>
      </div>
    );
  },
  // 仅当块自身或位置变化时重渲染，保证 30 块规模下输入流畅
  (prev, next) =>
    prev.block === next.block && prev.index === next.index && prev.total === next.total,
);

export default function ServiceContentEditor({
  value,
  onChange,
  legacyContent,
}: ServiceContentEditorProps) {
  // 用 ref 持有最新的 onChange，保证 emit 引用长期稳定（配合 memo 子组件）
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const blocks = useMemo(() => toBlocks(value), [value]);
  const blocksRef = useRef<ContentBlock[]>(blocks);
  blocksRef.current = blocks;

  const emit = useCallback((next: ContentBlock[]) => {
    blocksRef.current = next;
    onChangeRef.current?.({ version: 1, blocks: next });
  }, []);

  const updateBlock = useCallback(
    (next: ContentBlock) => {
      emit(blocksRef.current.map((item) => (item.id === next.id ? next : item)));
    },
    [emit],
  );

  const removeBlock = useCallback(
    (id: string) => {
      emit(blocksRef.current.filter((item) => item.id !== id));
    },
    [emit],
  );

  const moveBlock = useCallback(
    (id: string, direction: -1 | 1) => {
      const list = [...blocksRef.current];
      const from = list.findIndex((item) => item.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= list.length) return;
      [list[from], list[to]] = [list[to], list[from]];
      emit(list);
    },
    [emit],
  );

  const addBlock = useCallback(
    (type: BlockType) => {
      if (blocksRef.current.length >= MAX_BLOCKS) {
        message.warning(`内容块最多 ${MAX_BLOCKS} 个`);
        return;
      }
      emit([...blocksRef.current, createBlock(type)]);
    },
    [emit],
  );

  // 拖拽排序：PointerSensor 加 4px 阈值，避免误触
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const list = blocksRef.current;
      const from = list.findIndex((item) => item.id === active.id);
      const to = list.findIndex((item) => item.id === over.id);
      if (from < 0 || to < 0) return;
      emit(arrayMove(list, from, to));
    },
    [emit],
  );

  /**
   * US-035：旧版纯文本自动转换
   * 仅当「无块数据 + 有旧 content」时触发；同一编辑会话只提示一次；只改表单值，不自动提交。
   */
  const legacyConvertedRef = useRef(false);
  useEffect(() => {
    if (legacyConvertedRef.current) return;
    if (blocks.length > 0) {
      legacyConvertedRef.current = true;
      return;
    }
    const converted = parseLegacyContent(legacyContent);
    if (converted.length === 0) return;
    legacyConvertedRef.current = true;
    message.info('旧版纯文本详情已自动转为段落块，可继续添加其他内容块');
    emit(converted);
  }, [blocks.length, legacyContent, emit]);

  // 窄屏（< 1200px）时预览区下移
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1200);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1200);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // US-037：套用模板（覆盖当前块，需二次确认，不自动保存）
  const applyTemplate = useCallback(
    (key: string) => {
      const template = CONTENT_TEMPLATES.find((item) => item.key === key);
      if (!template) return;
      Modal.confirm({
        title: `套用「${template.name}」模板？`,
        content: '套用后将覆盖当前已添加的全部内容块。套用不会自动保存，可继续编辑后手动保存。',
        okText: '确认套用',
        cancelText: '取消',
        onOk: () => {
          emit(template.build());
          message.success(`已套用「${template.name}」模板，请确认内容后保存`);
        },
      });
    },
    [emit],
  );

  const addMenu = {
    items: BLOCK_TYPES.map((type) => ({
      key: type,
      icon: TYPE_ICONS[type],
      label: (
        <div style={{ minWidth: 190, padding: '2px 0' }}>
          <div style={{ fontSize: 13, color: '#2B2018' }}>{BLOCK_TYPE_LABELS[type].label}</div>
          <div style={{ fontSize: 11, color: '#9A8F86' }}>{BLOCK_TYPE_LABELS[type].description}</div>
        </div>
      ),
    })),
    onClick: ({ key }: { key: string }) => addBlock(key as BlockType),
  };

  const templateMenu = {
    items: CONTENT_TEMPLATES.map((template) => ({
      key: template.key,
      label: (
        <div style={{ minWidth: 240, padding: '2px 0' }}>
          <div style={{ fontSize: 13, color: '#2B2018' }}>{template.name}</div>
          <div style={{ fontSize: 11, color: '#9A8F86' }}>{template.summary}</div>
        </div>
      ),
    })),
    onClick: ({ key }: { key: string }) => applyTemplate(key),
  };

  const editorPane = (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Dropdown menu={addMenu} trigger={['click']}>
          <Button type="primary" icon={<PlusOutlined />}>
            添加块 <DownOutlined />
          </Button>
        </Dropdown>
        <Dropdown menu={templateMenu} trigger={['click']}>
          <Button icon={<ThunderboltOutlined />}>套用模板</Button>
        </Dropdown>
        <span style={{ fontSize: 12, color: '#9A8F86' }}>
          共 {blocks.length} 个内容块（上限 {MAX_BLOCKS}）
        </span>
      </Space>

      {blocks.length === 0 ? (
        <div
          style={{
            border: '1px dashed #E7DECF',
            borderRadius: 8,
            padding: '32px 16px',
            textAlign: 'center',
            color: '#B8A78C',
            fontSize: 13,
            background: '#FCFAF7',
          }}
        >
          暂无内容块，点击上方「添加块」开始编排服务详情
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block, index) => (
              <SortableBlockCard
                key={block.id}
                block={block}
                index={index}
                total={blocks.length}
                onChange={updateBlock}
                onRemove={removeBlock}
                onMove={moveBlock}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );

  const previewPane = (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 8,
          fontSize: 13,
          color: '#7A684F',
        }}
      >
        <span style={{ fontWeight: 600 }}>实时预览</span>
        <span style={{ marginLeft: 8, fontSize: 11, color: '#B8A78C' }}>与小程序详情页一致</span>
        <Button
          type="link"
          size="small"
          style={{ marginLeft: 'auto' }}
          onClick={() => setPreviewCollapsed((prev) => !prev)}
        >
          {previewCollapsed ? '展开' : '折叠'}
        </Button>
      </div>
      {!previewCollapsed && <ServiceContentPreview blocks={blocks} />}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: narrow ? 'wrap' : 'nowrap' }}>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>{editorPane}</div>
      <div style={{ flex: narrow ? '1 1 100%' : '0 0 391px' }}>{previewPane}</div>
    </div>
  );
}
