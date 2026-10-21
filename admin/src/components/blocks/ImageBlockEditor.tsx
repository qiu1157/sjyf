import { memo } from 'react';
import { Input } from 'antd';
import ImageUpload from '../ImageUpload';
import type { ImageBlock } from '../../utils/contentBlocks';
import { MAX_CAPTION_LENGTH } from '../../utils/contentBlocks';
import { HINT_STYLE } from './shared';

interface Props {
  block: ImageBlock;
  onChange: (next: ImageBlock) => void;
}

/** 单图块：1 张图（JPG/PNG ≤2MB）+ 选填图注（≤30 字符） */
export default memo(function ImageBlockEditor({ block, onChange }: Props) {
  return (
    <div>
      <ImageUpload
        type="content-image"
        hint="JPG/PNG，≤2MB，建议宽度 750px"
        value={block.url}
        onChange={(url) => onChange({ ...block, url })}
      />
      <div style={{ marginTop: 12 }}>
        <Input
          placeholder="图注（选填，如「厨房台面」）"
          value={block.caption ?? ''}
          maxLength={MAX_CAPTION_LENGTH}
          showCount
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
        />
      </div>
      <div style={HINT_STYLE}>图片在详情页按屏幕宽度自适应展示</div>
    </div>
  );
});
