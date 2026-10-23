import { memo } from 'react';
import { Button, Form, Select, Tag, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ParamsBlock, ParamsItem, ParamKey, ParamFieldValues } from '../../utils/contentBlocks';
import {
  PARAM_KEY_ORDER,
  PARAM_KEY_LABELS,
  MAX_PARAM_ITEMS,
  deriveParamRow,
  isParamFieldFilled,
  isKeyedParamItem,
  matchParamKeyByLabel,
  selectParamFieldValues,
} from '../../utils/contentBlocks';
import { HINT_STYLE, ROW_DELETE_STYLE } from './shared';

interface Props {
  block: ParamsBlock;
  onChange: (next: ParamsBlock) => void;
}

/** 字段键 → 服务档案区对应的 Form.Item 字段名（用于「去填写」定位） */
const ARCHIVE_FIELD_NAMES: Record<ParamKey, string> = {
  duration: 'duration',
  people_count: 'people_count',
  area_max: 'area_max',
  price_unit: 'price_unit',
  scope: 'scope',
  validity_days: 'validity_days',
};

/** 只读值展示框（灰底，非输入框）：值来自服务档案，不允许手打 */
const READONLY_STYLE: React.CSSProperties = {
  minWidth: 0,
  height: 32,
  lineHeight: '30px',
  padding: '0 11px',
  background: '#F5F2EC',
  border: '1px solid #E7DECF',
  borderRadius: 6,
  color: '#4A4038',
  fontSize: 13,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  flexWrap: 'wrap',
};

const INHERIT_HINT_STYLE: React.CSSProperties = { fontSize: 12, color: '#9A8F86', whiteSpace: 'nowrap' };

const EMPTY_HINT_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: '#C25450',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  whiteSpace: 'nowrap',
};

/**
 * 参数清单块（US-039）：不再手打值，改为「受控字段下拉 + 只读灰底值」
 * - 每行只读值实时来自上级 Form 的「服务档案」区（Form.useWatch 订阅）
 * - 「添加参数」为字段选择下拉，已占用字段置灰不可重复
 * - 历史自由文本项标记「未绑定」，可一键「改为绑定字段」
 */
export default memo(function ParamsBlockEditor({ block, onChange }: Props) {
  const form = Form.useFormInstance();
  // 订阅服务档案区 6 个字段：档案区一改，此处只读值与手机预览同步刷新
  // Form.useWatch 首参为「单个字段路径」，须用选择器从全量值中抽取（详见 selectParamFieldValues 注释）
  const watched = Form.useWatch(selectParamFieldValues, form) as ParamFieldValues | undefined;
  const archiveValues: ParamFieldValues = watched ?? {};

  const usedKeys = new Set(block.items.filter(isKeyedParamItem).map((item) => item.key));

  const updateItems = (items: ParamsItem[]) => onChange({ ...block, items });

  const addItem = (key: ParamKey) => {
    if (block.items.length >= MAX_PARAM_ITEMS) {
      message.warning(`最多 ${MAX_PARAM_ITEMS} 条参数`);
      return;
    }
    if (usedKeys.has(key)) return; // 同一字段不可重复添加
    updateItems([...block.items, { key }]);
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    updateItems(block.items.filter((_, i) => i !== index));
  };

  const changeKey = (index: number, key: ParamKey) => {
    if (usedKeys.has(key) && !(isKeyedParamItem(block.items[index]) && block.items[index].key === key)) return;
    updateItems(block.items.map((item, i) => (i === index ? { key } : item)));
  };

  /** 历史手填项 → 绑定字段：label 命中白名单则预选，否则落到首个未占用字段 */
  const bindItem = (index: number) => {
    const item = block.items[index];
    if (isKeyedParamItem(item)) return;
    const matched = matchParamKeyByLabel(item.label);
    const fallback = PARAM_KEY_ORDER.find((key) => !usedKeys.has(key));
    const key = matched && !usedKeys.has(matched) ? matched : fallback;
    if (!key) {
      message.warning('所有字段都已绑定，无法再转换');
      return;
    }
    updateItems(block.items.map((it, i) => (i === index ? { key } : it)));
  };

  /** 「去填写」：滚动到「服务档案」区对应输入项并聚焦（聚焦原生输入框，避免只滚动不获焦） */
  const gotoArchiveField = (key: ParamKey) => {
    const name = ARCHIVE_FIELD_NAMES[key];
    form?.scrollToField(name, { behavior: 'smooth', block: 'center' });
    // Form.Item 的 id 直接落在控件（InputNumber / Input 的 input）上，直接聚焦即可
    const el = document.getElementById(name) as HTMLElement | null;
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => (document.getElementById(name) as HTMLElement | null)?.focus?.(), 160);
  };

  return (
    <div data-testid="params-block">
      {block.items.map((item, index) => {
        if (isKeyedParamItem(item)) {
          const row = deriveParamRow(item.key, archiveValues);
          const filled = isParamFieldFilled(item.key, archiveValues);
          return (
            <div key={index} style={ROW_STYLE}>
              <Select
                value={item.key}
                style={{ width: 132 }}
                onChange={(value) => changeKey(index, value as ParamKey)}
                options={PARAM_KEY_ORDER.map((key) => ({
                  value: key,
                  label: PARAM_KEY_LABELS[key],
                  disabled: key !== item.key && usedKeys.has(key),
                }))}
              />
              <div style={{ ...READONLY_STYLE, flex: 1 }} title={row.value} data-param-value={item.key}>
                {row.value}
              </div>
              <span style={INHERIT_HINT_STYLE}>值已从服务档案继承</span>
              {!filled && (
                <span style={EMPTY_HINT_STYLE}>
                  该字段未填写
                  <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={() => gotoArchiveField(item.key)}>
                    去填写
                  </Button>
                </span>
              )}
              <DeleteOutlined
                style={{ ...ROW_DELETE_STYLE, opacity: block.items.length <= 1 ? 0.3 : 1 }}
                onClick={() => removeItem(index)}
              />
            </div>
          );
        }
        // 历史自由文本项：标记未绑定，提供一键升级
        return (
          <div key={index} style={ROW_STYLE}>
            <div style={{ ...READONLY_STYLE, flex: '0 0 132px', width: 132 }} title={item.label}>
              {item.label}
            </div>
            <div style={{ ...READONLY_STYLE, flex: 1 }} title={item.value}>
              {item.value}
            </div>
            <Tag color="warning" style={{ marginInlineEnd: 0 }}>
              未绑定
            </Tag>
            <Button size="small" onClick={() => bindItem(index)}>
              改为绑定字段
            </Button>
            <DeleteOutlined
              style={{ ...ROW_DELETE_STYLE, opacity: block.items.length <= 1 ? 0.3 : 1 }}
              onClick={() => removeItem(index)}
            />
          </div>
        );
      })}
      {block.items.length < MAX_PARAM_ITEMS && (
        <Select
          style={{ width: 132 }}
          placeholder="添加参数"
          value={null}
          onChange={(value) => addItem(value as ParamKey)}
          options={PARAM_KEY_ORDER.map((key) => ({
            value: key,
            label: PARAM_KEY_LABELS[key],
            disabled: usedKeys.has(key),
          }))}
        />
      )}
      <div style={HINT_STYLE}>参数值来自「服务档案」区，此处只读；最多 {MAX_PARAM_ITEMS} 条</div>
    </div>
  );
});
