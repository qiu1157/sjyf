import { memo, useState } from 'react';
import { Button, Input, Popover } from 'antd';
import { DeleteOutlined, DownOutlined } from '@ant-design/icons';
import type { GuaranteeBlock, GuaranteeIcon, GuaranteeItem } from '../../utils/contentBlocks';
import {
  GUARANTEE_ICON_NAMES,
  MAX_GUARANTEE_DESC_LENGTH,
  MAX_GUARANTEE_ITEMS,
  MAX_GUARANTEE_TITLE_LENGTH,
  MIN_GUARANTEE_ITEMS,
} from '../../utils/contentBlocks';
import GuaranteeIconSvg, { GUARANTEE_ICON_LABELS } from './GuaranteeIcons';
import { HINT_STYLE, ROW_DELETE_STYLE } from './shared';

interface Props {
  block: GuaranteeBlock;
  onChange: (next: GuaranteeBlock) => void;
}

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  flexWrap: 'wrap',
};

/** 取白名单中首个未被占用的图标（新增项时给出合理默认值） */
function nextFreeIcon(used: GuaranteeIcon[]): GuaranteeIcon {
  return GUARANTEE_ICON_NAMES.find((name) => !used.includes(name)) ?? GUARANTEE_ICON_NAMES[0];
}

/** 图标选择器：可视化网格（10 个内置图标），不接受文字输入，不出现 emoji */
function IconPicker({ value, onChange }: { value: GuaranteeIcon; onChange: (icon: GuaranteeIcon) => void }) {
  const [open, setOpen] = useState(false);
  const content = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 40px)', gap: 6 }}>
      {GUARANTEE_ICON_NAMES.map((name) => {
        const selected = name === value;
        return (
          <button
            key={name}
            type="button"
            title={GUARANTEE_ICON_LABELS[name]}
            aria-label={GUARANTEE_ICON_LABELS[name]}
            aria-pressed={selected}
            onClick={() => {
              onChange(name);
              setOpen(false);
            }}
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              cursor: 'pointer',
              border: `1px solid ${selected ? '#B76E45' : '#E7DECF'}`,
              background: selected ? '#FBF4EE' : '#fff',
            }}
          >
            <GuaranteeIconSvg name={name} size={18} color={selected ? '#B76E45' : '#7A684F'} />
          </button>
        );
      })}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      content={content}
      trigger="click"
      placement="bottomLeft"
      title="选择图标"
    >
      <Button
        style={{ width: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}
        aria-label="选择保障图标"
        data-testid={`guarantee-icon-${value}`}
      >
        <GuaranteeIconSvg name={value} size={16} color="#9E5B37" />
        <DownOutlined style={{ fontSize: 9, color: '#B8A78C' }} />
      </Button>
    </Popover>
  );
}

/**
 * 服务保障块（US-040）
 * - 每项：图标（可视化网格选择）+ 标题（必填 ≤8 字）+ 说明（选填 ≤20 字）
 * - 项数限 2~4 项；数量校验以服务端为权威，此处仅做即时约束
 */
export default memo(function GuaranteeBlockEditor({ block, onChange }: Props) {
  const updateItems = (items: GuaranteeItem[]) => onChange({ ...block, items });

  const changeItem = (index: number, patch: Partial<GuaranteeItem>) => {
    updateItems(block.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    updateItems([
      ...block.items,
      { icon: nextFreeIcon(block.items.map((item) => item.icon)), title: '' },
    ]);
  };

  const removeItem = (index: number) => {
    updateItems(block.items.filter((_, i) => i !== index));
  };

  const countInvalid = block.items.length < MIN_GUARANTEE_ITEMS || block.items.length > MAX_GUARANTEE_ITEMS;

  return (
    <div data-testid="guarantee-block">
      {block.items.map((item, index) => (
        <div key={index} style={ROW_STYLE}>
          <IconPicker value={item.icon} onChange={(icon) => changeItem(index, { icon })} />
          <Input
            value={item.title}
            placeholder={`标题（必填 ≤${MAX_GUARANTEE_TITLE_LENGTH} 字）`}
            style={{ width: 150 }}
            onChange={(event) => changeItem(index, { title: event.target.value })}
            data-testid={`guarantee-title-${index}`}
          />
          <Input
            value={item.desc ?? ''}
            placeholder={`说明（选填 ≤${MAX_GUARANTEE_DESC_LENGTH} 字）`}
            style={{ flex: 1, minWidth: 160 }}
            onChange={(event) => changeItem(index, { desc: event.target.value })}
            data-testid={`guarantee-desc-${index}`}
          />
          <DeleteOutlined
            style={ROW_DELETE_STYLE}
            onClick={() => removeItem(index)}
            aria-label="删除该保障项"
          />
        </div>
      ))}
      <Button onClick={addItem} data-testid="guarantee-add">
        添加保障项
      </Button>
      <div style={countInvalid ? { ...HINT_STYLE, color: '#D99A3D' } : HINT_STYLE} data-testid="guarantee-hint">
        共 {block.items.length} 项（限 {MIN_GUARANTEE_ITEMS}~{MAX_GUARANTEE_ITEMS} 项，未满足时无法保存）；
        标题必填 ≤{MAX_GUARANTEE_TITLE_LENGTH} 字，说明选填 ≤{MAX_GUARANTEE_DESC_LENGTH} 字
      </div>
    </div>
  );
});
