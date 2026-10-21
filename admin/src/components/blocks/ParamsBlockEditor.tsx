import { memo } from 'react';
import { Button, Input, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ParamsBlock, ParamItem } from '../../utils/contentBlocks';
import { MAX_PARAM_ITEMS, MAX_PARAM_LABEL_LENGTH, MAX_PARAM_VALUE_LENGTH } from '../../utils/contentBlocks';
import { HINT_STYLE, ROW_DELETE_STYLE } from './shared';

interface Props {
  block: ParamsBlock;
  onChange: (next: ParamsBlock) => void;
}

/** 参数清单块：1-12 行「参数名 + 参数值」 */
export default memo(function ParamsBlockEditor({ block, onChange }: Props) {
  const updateItem = (index: number, patch: Partial<ParamItem>) => {
    const items = block.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange({ ...block, items });
  };

  const addItem = () => {
    if (block.items.length >= MAX_PARAM_ITEMS) {
      message.warning(`最多 ${MAX_PARAM_ITEMS} 条参数`);
      return;
    }
    onChange({ ...block, items: [...block.items, { label: '', value: '' }] });
  };

  const removeItem = (index: number) => {
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });
  };

  return (
    <div>
      {block.items.map((item, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Input
            placeholder="参数名，如「服务时长」"
            value={item.label}
            maxLength={MAX_PARAM_LABEL_LENGTH}
            style={{ width: 200 }}
            onChange={(e) => updateItem(index, { label: e.target.value })}
          />
          <Input
            placeholder="参数值，如「120 分钟」"
            value={item.value}
            maxLength={MAX_PARAM_VALUE_LENGTH}
            onChange={(e) => updateItem(index, { value: e.target.value })}
          />
          <DeleteOutlined
            style={{ ...ROW_DELETE_STYLE, opacity: block.items.length <= 1 ? 0.3 : 1 }}
            onClick={() => block.items.length > 1 && removeItem(index)}
          />
        </div>
      ))}
      {block.items.length < MAX_PARAM_ITEMS && (
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem}>
          添加参数
        </Button>
      )}
      <div style={HINT_STYLE}>至少 1 条，最多 {MAX_PARAM_ITEMS} 条；详情页展示为浅底两列表格</div>
    </div>
  );
});
