import { memo } from 'react';
import { Button, Input, Radio, Space, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import ImageUpload from '../ImageUpload';
import type { ImageGroupBlock, ImageItem } from '../../utils/contentBlocks';
import { MAX_CAPTION_LENGTH, MAX_GROUP_IMAGES } from '../../utils/contentBlocks';
import { HINT_STYLE, ROW_DELETE_STYLE } from './shared';

interface Props {
  block: ImageGroupBlock;
  onChange: (next: ImageGroupBlock) => void;
}

/** 多图宫格块：2/3 列，1-9 张图片，每张可填图注 */
export default memo(function ImageGroupBlockEditor({ block, onChange }: Props) {
  const updateImage = (index: number, patch: Partial<ImageItem>) => {
    const images = block.images.map((image, i) => (i === index ? { ...image, ...patch } : image));
    onChange({ ...block, images });
  };

  const addImage = () => {
    if (block.images.length >= MAX_GROUP_IMAGES) {
      message.warning(`最多 ${MAX_GROUP_IMAGES} 张图片`);
      return;
    }
    onChange({ ...block, images: [...block.images, { url: '' }] });
  };

  const removeImage = (index: number) => {
    onChange({ ...block, images: block.images.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <Space size={16} style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#7A684F' }}>列数</span>
        <Radio.Group
          value={block.columns}
          onChange={(e) => onChange({ ...block, columns: e.target.value })}
        >
          <Radio.Button value={2}>2 列</Radio.Button>
          <Radio.Button value={3}>3 列</Radio.Button>
        </Radio.Group>
        <span style={{ fontSize: 12, color: '#9A8F86' }}>
          已添加 {block.images.length}/{MAX_GROUP_IMAGES} 张
        </span>
      </Space>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {block.images.map((image, index) => (
          <div
            key={index}
            style={{
              width: 200,
              border: '1px solid #F0E9E0',
              borderRadius: 8,
              padding: 8,
              background: '#FCFAF7',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#9A8F86' }}>图 {index + 1}</span>
              <DeleteOutlined
                style={{ ...ROW_DELETE_STYLE, opacity: block.images.length <= 1 ? 0.3 : 1 }}
                onClick={() => block.images.length > 1 && removeImage(index)}
              />
            </div>
            <ImageUpload
              compact
              type="content-image"
              value={image.url}
              onChange={(url) => updateImage(index, { url })}
            />
            <div style={{ marginTop: 8 }}>
              <Input
                size="small"
                placeholder="图注（选填）"
                value={image.caption ?? ''}
                maxLength={MAX_CAPTION_LENGTH}
                onChange={(e) => updateImage(index, { caption: e.target.value })}
              />
            </div>
          </div>
        ))}

        {block.images.length < MAX_GROUP_IMAGES && (
          <Button
            type="dashed"
            onClick={addImage}
            style={{ width: 200, height: 150 }}
            icon={<PlusOutlined />}
          >
            添加图片
          </Button>
        )}
      </div>
      <div style={HINT_STYLE}>至少 1 张图片，最多 {MAX_GROUP_IMAGES} 张；详情页按所选列数等比排列</div>
    </div>
  );
});
