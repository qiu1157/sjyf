import { memo } from 'react';
import { Input } from 'antd';
import type { HeadingBlock } from '../../utils/contentBlocks';
import { MAX_HEADING_LENGTH } from '../../utils/contentBlocks';
import { HINT_STYLE } from './shared';

interface Props {
  block: HeadingBlock;
  onChange: (next: HeadingBlock) => void;
}

/** 小标题块：单行输入，1-30 字符 */
export default memo(function HeadingBlockEditor({ block, onChange }: Props) {
  return (
    <div>
      <Input
        placeholder="请输入小标题，如「服务包含」"
        value={block.text}
        maxLength={MAX_HEADING_LENGTH}
        showCount
        onChange={(e) => onChange({ ...block, text: e.target.value })}
      />
      <div style={HINT_STYLE}>详情页展示为左侧带主色竖条的加粗标题</div>
    </div>
  );
});
