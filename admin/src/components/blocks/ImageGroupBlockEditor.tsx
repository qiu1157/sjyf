import { memo, useRef, useState, type ChangeEvent } from 'react';
import { Button, Input, Radio, Space, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import ImageUpload, { uploadImageFile, validateImageFile } from '../ImageUpload';
import type { ImageGroupBlock, ImageItem } from '../../utils/contentBlocks';
import { MAX_CAPTION_LENGTH, MAX_GROUP_IMAGES, MAX_IMAGES, RECOMMENDED_IMAGES } from '../../utils/contentBlocks';
import { HINT_STYLE, ROW_DELETE_STYLE } from './shared';

interface Props {
  block: ImageGroupBlock;
  totalImages: number;
  onChange: (next: ImageGroupBlock) => void;
}

/** 多图宫格块：2/3 列，1-9 张图片，每张可填图注 */
export default memo(function ImageGroupBlockEditor({ block, totalImages, onChange }: Props) {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const [batchUploading, setBatchUploading] = useState(false);

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

  const filledCount = block.images.filter((image) => !!image.url).length;
  const remainingByGroup = Math.max(MAX_GROUP_IMAGES - filledCount, 0);
  const remainingByService = Math.max(MAX_IMAGES - totalImages, 0);
  const uploadRemaining = Math.min(remainingByGroup, remainingByService);

  const applyUploadedUrls = (urls: string[]) => {
    if (urls.length === 0) return;
    const images = [...block.images];
    for (const url of urls) {
      const emptyIndex = images.findIndex((image) => !image.url);
      if (emptyIndex >= 0) images[emptyIndex] = { ...images[emptyIndex], url };
      else images.push({ url });
    }
    onChange({ ...block, images });
  };

  const handleBatchSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;
    if (uploadRemaining <= 0) {
      message.warning(`当前块最多还能上传 ${MAX_GROUP_IMAGES} 张，且全服务正文图总数最多 ${MAX_IMAGES} 张`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      const error = validateImageFile(file, 'content-image');
      if (error) {
        message.error(`${file.name}：${error}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;
    const queue = validFiles.slice(0, uploadRemaining);
    if (validFiles.length > queue.length) {
      message.warning(`本次最多还能补充 ${uploadRemaining} 张图片，其余文件已忽略`);
    }

    setBatchUploading(true);
    const successUrls: string[] = [];
    let failedCount = 0;
    try {
      // 顺序上传，保证宫格图片在后台与端上的展示顺序一致。
      for (const file of queue) {
        try {
          successUrls.push(await uploadImageFile(file, 'content-image'));
        } catch {
          failedCount += 1;
        }
      }
      applyUploadedUrls(successUrls);
      if (successUrls.length > 0) {
        message.success(
          failedCount > 0 ? `已上传 ${successUrls.length} 张，失败 ${failedCount} 张` : `已上传 ${successUrls.length} 张图片`,
        );
      } else if (failedCount > 0) {
        message.error('批量上传失败，请重试');
      }
    } finally {
      setBatchUploading(false);
    }
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
          当前块已上传 {filledCount}/{MAX_GROUP_IMAGES} 张
        </span>
        <span style={{ fontSize: 12, color: '#9A8F86' }}>
          当前服务正文图 {totalImages}/{MAX_IMAGES} 张
        </span>
      </Space>

      <input
        ref={pickerRef}
        data-testid="image-group-batch-input"
        type="file"
        accept="image/jpeg,image/png"
        multiple
        style={{ display: 'none' }}
        onChange={handleBatchSelect}
      />

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

        <Button
          data-testid="image-group-batch-upload"
          type="dashed"
          style={{ width: 200, height: 150 }}
          icon={<PlusOutlined />}
          loading={batchUploading}
          disabled={uploadRemaining <= 0}
          onClick={() => pickerRef.current?.click()}
        >
          {batchUploading ? '批量上传中...' : '批量上传'}
        </Button>
      </div>
      <div style={HINT_STYLE}>
        至少 1 张图片，最多 {MAX_GROUP_IMAGES} 张；建议同组图片保持统一比例（4:3 或 3:4）；当前块还可补充 {uploadRemaining} 张，
        当前服务正文图建议控制在 {RECOMMENDED_IMAGES} 张以内、系统总上限 {MAX_IMAGES} 张
      </div>
    </div>
  );
});
