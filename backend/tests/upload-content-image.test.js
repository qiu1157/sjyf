const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// 必须在 require 前设置，UploadService 模块加载时即解析上传根目录
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'sjyf-upload-'));
process.env.UPLOAD_ROOT = path.join(TMP_ROOT, 'uploads');

const { UploadService } = require('../dist/modules/upload/upload.service');

const service = new UploadService();

/** 造一个 multer 风格的文件对象 */
function fakeFile(overrides = {}) {
  return {
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-bytes'),
    ...overrides,
  };
}

function servicesDir() {
  return path.join(TMP_ROOT, 'uploads', 'services');
}

test.after(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

test('content-image：JPG 上传成功，返回 /uploads/services/ 路径且不生成缩略图', async () => {
  const result = await service.handleUpload('content-image', fakeFile());

  assert.match(result.url, /^\/uploads\/services\/\d+-[a-z0-9]+\.jpg$/);
  assert.equal(result.thumbUrl, undefined, 'content-image 不应返回 thumbUrl');
  assert.ok(fs.existsSync(path.join(TMP_ROOT, 'uploads', result.url.replace('/uploads/', ''))), '原图应落盘');

  const thumbs = fs.readdirSync(servicesDir()).filter((name) => name.includes('_thumb'));
  assert.equal(thumbs.length, 0, '不应生成 _thumb 缩略图文件');
});

test('content-image：PNG 上传成功', async () => {
  const result = await service.handleUpload(
    'content-image',
    fakeFile({ originalname: 'pic.png', mimetype: 'image/png' }),
  );
  assert.match(result.url, /^\/uploads\/services\/\d+-[a-z0-9]+\.png$/);
});

test('content-image：非 JPG/PNG（GIF）被拒', async () => {
  await assert.rejects(
    () => service.handleUpload('content-image', fakeFile({ originalname: 'a.gif', mimetype: 'image/gif' })),
    /仅支持 JPG\/PNG 格式图片/,
  );
});

test('content-image：PDF 被拒', async () => {
  await assert.rejects(
    () => service.handleUpload('content-image', fakeFile({ originalname: 'a.pdf', mimetype: 'application/pdf' })),
    /仅支持 JPG\/PNG 格式图片/,
  );
});

test('content-image：超过 2MB 被拒，提示上限 2048KB', async () => {
  await assert.rejects(
    () => service.handleUpload('content-image', fakeFile({ size: 3 * 1024 * 1024 })),
    /文件大小超过限制，最大 2048KB/,
  );
});

test('content-image：恰好 2MB 允许通过（边界）', async () => {
  const result = await service.handleUpload('content-image', fakeFile({ size: 2 * 1024 * 1024 }));
  assert.ok(result.url.startsWith('/uploads/services/'));
});

test('未选文件 → 400「请选择要上传的文件」', async () => {
  await assert.rejects(() => service.handleUpload('content-image', undefined), /请选择要上传的文件/);
});

test('未知上传类型被拒', async () => {
  await assert.rejects(() => service.handleUpload('not-exist-type', fakeFile()), /未知的上传类型/);
});
