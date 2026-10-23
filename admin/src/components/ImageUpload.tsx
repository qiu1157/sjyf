import { useState } from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import request from '../utils/request';

export type ImageUploadType = 'category-icon' | 'service-image' | 'banner-image' | 'content-image';

// 后端上传接口路径（不含 /api 前缀，request baseURL 会自动拼接）
const UPLOAD_PATHS: Record<ImageUploadType, string> = {
  'category-icon': '/admin/upload/category-icon',
  'service-image': '/admin/upload/service-image',
  'banner-image': '/admin/upload/banner-image',
  'content-image': '/admin/upload/content-image',
};

/** 同一套图片大小规则，供单图组件与批量上传复用 */
export function getImageUploadLimit(type: ImageUploadType): number {
  return type === 'category-icon' ? 500 * 1024 : 2 * 1024 * 1024;
}

/** 统一校验图片格式与大小，返回 null 表示通过 */
export function validateImageFile(file: File, type: ImageUploadType): string | null {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) return '仅支持 JPG/PNG 格式图片';
  const limit = getImageUploadLimit(type);
  if (file.size > limit) {
    const kb = Math.floor(limit / 1024);
    return `文件大小超过限制，最大 ${kb}KB`;
  }
  return null;
}

/** 统一上传实现，返回后端落库后的图片地址 */
export async function uploadImageFile(file: File, type: ImageUploadType): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request.post(UPLOAD_PATHS[type], formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res as any).url;
}

interface ImageUploadProps {
  value?: string;
  onChange?: (value: string) => void;
  type?: ImageUploadType;
  hint?: string;
  /** 紧凑模式：单图方块（多图宫格列表内使用），默认 false */
  compact?: boolean;
}

export default function ImageUpload({ value, onChange, type = 'category-icon', hint = '推荐 200×200 正方形', compact = false }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  // 上传前校验：格式 + 大小
  const beforeUpload = (file: File) => {
    const error = validateImageFile(file, type);
    if (error) {
      message.error(error);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  // 自定义上传：用 request 实例调用后端接口，拦截响应取 url
  const customRequest = async (options: UploadRequestOption) => {
    const { file, onSuccess, onError } = options;
    setLoading(true);
    try {
      const url = await uploadImageFile(file as File, type);
      onChange?.(url);
      onSuccess?.({}, file as any);
      message.success('上传成功');
    } catch (err) {
      onError?.(err as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <Upload.Dragger
        name="file"
        accept="image/jpeg,image/png"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        style={compact ? { width: 88, height: 88, padding: 0 } : { width: 160, height: 80 }}
      >
        {loading ? (
          <p style={{ margin: 0, color: '#999', fontSize: 12 }}>上传中...</p>
        ) : (
          <>
            <p style={{ margin: compact ? '10px 0 0' : '4px 0', fontSize: 12, color: '#999' }}>
              <InboxOutlined style={{ fontSize: compact ? 16 : 20, marginRight: 4 }} />
              {compact ? '' : '点击上传图标'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#bbb' }}>{compact ? '上传图片' : hint}</p>
          </>
        )}
      </Upload.Dragger>
      {value && (
        <div style={{ position: 'relative', width: compact ? 88 : 80, height: compact ? 88 : 80 }}>
          <img
            src={value}
            alt="图标预览"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #E7DECF' }}
          />
          <DeleteOutlined
            style={{
              position: 'absolute', top: -6, right: -6,
              background: '#fff', borderRadius: '50%', padding: 2,
              color: '#C25450', cursor: 'pointer', fontSize: 14,
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
            onClick={() => onChange?.('')}
          />
        </div>
      )}
    </div>
  );
}
