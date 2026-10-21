import { memo } from 'react';
import { Input } from 'antd';
import type { TextBlock } from '../../utils/contentBlocks';
import { MAX_TEXT_LENGTH } from '../../utils/contentBlocks';
import { HINT_STYLE } from './shared';

interface Props {
  block: TextBlock;
  onChange: (next: TextBlock) => void;
}

/** 段落块：多行文本，1-2000 字符，支持换行 */
export default memo(function TextBlockEditor({ block, onChange }: Props) {
  return (
    <div>
      <Input.TextArea
        placeholder="请输入段落内容，换行将在详情页保留"
        value={block.text}
        maxLength={MAX_TEXT_LENGTH}
        showCount
        autoSize={{ minRows: 3, maxRows: 8 }}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
      />
      <div style={HINT_STYLE}>换行会原样保留在详情页</div>
    </div>
  );
});
