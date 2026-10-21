import { useState } from 'react';
import type { ContentBlock, ImageItem } from '../utils/contentBlocks';

/**
 * 手机尺寸实时预览（US-034）
 * 说明：不生成 HTML，直接用 React 渲染块数据；样式与后端 HTML 快照规范（spec §5.3）保持一一对应，
 *      以便「后台预览 == 小程序实际渲染」。只读，无任何交互。
 */

interface Props {
  blocks: ContentBlock[];
}

/** 图片预览：加载失败时显示占位块，避免空白塌陷 */
function PreviewImage({ url, style }: { url: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  const baseStyle: React.CSSProperties = { width: '100%', display: 'block', borderRadius: 8, ...style };
  if (!url || failed) {
    return (
      <div
        style={{
          ...baseStyle,
          height: 120,
          background: '#F3EDE3',
          color: '#B8A78C',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {url ? '图片加载失败' : '尚未上传图片'}
      </div>
    );
  }
  return <img src={url} alt="" style={baseStyle} onError={() => setFailed(true)} />;
}

/** 图注：图片下方居中 */
function PreviewCaption({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div style={{ margin: '-6px 0 12px', fontSize: 12, color: '#9A8F86', textAlign: 'center' }}>{text}</div>
  );
}

function PreviewImageCell({ image, width }: { image: ImageItem; width: string }) {
  return (
    <div style={{ width, boxSizing: 'border-box', padding: 4 }}>
      <PreviewImage url={image.url} />
      {image.caption ? (
        <div style={{ margin: '4px 0 0', fontSize: 12, color: '#9A8F86', textAlign: 'center' }}>
          {image.caption}
        </div>
      ) : null}
    </div>
  );
}

function BlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h3
          style={{
            margin: '18px 0 10px',
            paddingLeft: 10,
            borderLeft: '3px solid #B76E45',
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.5,
            color: '#2B2018',
          }}
        >
          {block.text || '（未填写小标题）'}
        </h3>
      );
    case 'text':
      return (
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 14,
            lineHeight: 1.8,
            color: '#4A4038',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {block.text || '（未填写段落内容）'}
        </p>
      );
    case 'image':
      return (
        <>
          <div style={{ margin: '0 0 12px' }}>
            <PreviewImage url={block.url} />
          </div>
          <PreviewCaption text={block.caption} />
        </>
      );
    case 'imageGroup': {
      const width = block.columns === 3 ? '33.33%' : '50%';
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -4px 12px' }}>
          {block.images.map((image, index) => (
            <PreviewImageCell key={index} image={image} width={width} />
          ))}
        </div>
      );
    }
    case 'params':
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 12px', fontSize: 13 }}>
          <tbody>
            {block.items.map((item, index) => (
              <tr key={index}>
                <td
                  style={{
                    padding: '8px 10px',
                    background: '#FAF6F1',
                    color: '#8A7F76',
                    width: '38%',
                    borderBottom: '1px solid #F0E9E0',
                  }}
                >
                  {item.label}
                </td>
                <td style={{ padding: '8px 10px', color: '#2B2018', borderBottom: '1px solid #F0E9E0' }}>
                  {item.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

export default function ServiceContentPreview({ blocks }: Props) {
  return (
    <div
      style={{
        width: 375,
        margin: '0 auto',
        background: '#F5F2EC',
        border: '8px solid #2B2018',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      }}
    >
      {/* 状态栏装饰（纯视觉，非真实状态栏） */}
      <div
        style={{
          height: 28,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: '#9A8F86',
          borderBottom: '1px solid #F0E9E0',
        }}
      >
        9:41 · 小程序详情页预览
      </div>

      {/* 内容滚动区：固定高度，超出滚动 */}
      <div style={{ height: 520, overflowY: 'auto', padding: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#201A13', marginBottom: 12 }}>服务包含</div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
          {blocks.length === 0 ? (
            <div style={{ fontSize: 13, color: '#B8A78C', textAlign: 'center', padding: '32px 0' }}>
              暂无内容，请在左侧添加内容块
            </div>
          ) : (
            blocks.map((block) => <BlockView key={block.id} block={block} />)
          )}
        </div>
      </div>
    </div>
  );
}
