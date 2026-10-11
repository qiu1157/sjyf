import { useState } from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import request from '../utils/request';

// 后端上传接口路径（不含 /api 前缀，request baseURL 会自动拼接）
const UPLOAD_PATHS: Record<string, string> = {
  'category-icon': '/admin/upload/category-icon',
  'service-image': '/admin/upload/service-image',
  'banner-image': '/admin/upload/banner-image',
};

interface ImageUploadProps {
  value?: string;
  onChange?: (value: string) => void;
  type?: 'category-icon' | 'service-image' | 'banner-image';
  hint?: string;
}

export default function ImageUpload({ value, onChange, type = 'category-icon', hint = '推荐 200×200 正方形' }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  // 上传前校验：格式 + 大小
  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('仅支持 JPG/PNG 格式图片');
      return Upload.LIST_IGNORE;
    }
    const limit = type === 'category-icon' ? 500 * 1024 : 2 * 1024 * 1024;
    if (file.size > limit) {
      const kb = Math.floor(limit / 1024);
      message.error(`文件大小超过限制，最大 ${kb}KB`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  // 自定义上传：用 request 实例调用后端接口，拦截响应取 url
  const customRequest = async (options: UploadRequestOption) => {
    const { file, onSuccess, onError } = options;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      // request 拦截器已解包 data.data，res 即 {url, thumbUrl}
      const res = await request.post(UPLOAD_PATHS[type], formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = (res as any).url;
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
        style={{ width: 160, height: 80 }}
      >
        {loading ? (
          <p style={{ margin: 0, color: '#999', fontSize: 12 }}>上传中...</p>
        ) : (
          <>
            <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
              <InboxOutlined style={{ fontSize: 20, marginRight: 4 }} />
              点击上传图标
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#bbb' }}>{hint}</p>
          </>
        )}
      </Upload.Dragger>
      {value && (
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <img
            src={value}
            alt="图标预览"
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #E7DECF' }}
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
