import { memo } from 'react';
import { Input } from 'antd';
import ImageUpload from '../ImageUpload';
import type { ImageBlock } from '../../utils/contentBlocks';
import { MAX_CAPTION_LENGTH, MAX_IMAGES, RECOMMENDED_IMAGES } from '../../utils/contentBlocks';
import { HINT_STYLE } from './shared';

interface Props {
  block: ImageBlock;
  totalImages: number;
  onChange: (next: ImageBlock) => void;
}

/** 单图块：1 张图（JPG/PNG ≤2MB）+ 选填图注（≤30 字符） */
export default memo(function ImageBlockEditor({ block, totalImages, onChange }: Props) {
  const remainingImages = Math.max(MAX_IMAGES - totalImages, 0);

  return (
    <div>
      <ImageUpload
        type="content-image"
        hint="JPG/PNG，≤2MB，建议正文大图比例 4:3 或 3:4"
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
      <div style={HINT_STYLE}>
        当前服务正文图 {totalImages}/{MAX_IMAGES} 张，建议控制在 {RECOMMENDED_IMAGES} 张以内；图片在详情页按屏幕宽度自适应展示
        {block.url ? '' : `，当前还能再上传 ${remainingImages} 张`}
      </div>
    </div>
  );
});
