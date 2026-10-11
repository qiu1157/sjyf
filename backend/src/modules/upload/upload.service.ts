import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { resolveUploadRoot } from '../../config/upload.config';
// 使用 require 避免 esModuleInterop 运行时问题
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

// 上传类型配置：目录 / 缩略图尺寸 / 最大字节数
interface UploadConfig {
  subdir: string;          // 子目录名，如 services / categories
  thumbSize: number;       // 缩略图边长（正方形），0 表示不生成缩略图
  maxSize: number;         // 最大字节数
  generateThumb: boolean;  // 是否生成缩略图
}

// 上传根目录，默认落到当前工作目录下的 uploads，也可由 UPLOAD_ROOT 覆盖
const UPLOAD_ROOT = resolveUploadRoot();

// 各类型配置
const CONFIGS: Record<string, UploadConfig> = {
  'category-icon': { subdir: 'categories', thumbSize: 80, maxSize: 500 * 1024, generateThumb: true },
  'service-image': { subdir: 'services', thumbSize: 200, maxSize: 2 * 1024 * 1024, generateThumb: true },
  'banner-image': { subdir: 'services', thumbSize: 0, maxSize: 2 * 1024 * 1024, generateThumb: false },
  'leader-photo': { subdir: 'order-photos', thumbSize: 0, maxSize: 5 * 1024 * 1024, generateThumb: false },
};

// 允许的图片 MIME 类型
const ALLOWED_MIME = ['image/jpeg', 'image/png'];

@Injectable()
export class UploadService {
  // 处理上传文件：校验 -> 存原图 -> 生成缩略图 -> 返回路径
  async handleUpload(type: string, file: Express.Multer.File): Promise<{ url: string; thumbUrl?: string }> {
    const config = CONFIGS[type];
    if (!config) throw new BadRequestException('未知的上传类型');

    // 校验文件存在
    if (!file) throw new BadRequestException('请选择要上传的文件');

    // 校验格式
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG/PNG 格式图片');
    }

    // 校验大小
    if (file.size > config.maxSize) {
      const maxKB = Math.floor(config.maxSize / 1024);
      throw new BadRequestException(`文件大小超过限制，最大 ${maxKB}KB`);
    }

    // 确保目标目录存在
    const targetDir = path.join(UPLOAD_ROOT, config.subdir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 生成唯一文件名：时间戳 + 随机串 + 原扩展名
    const ext = path.extname(file.originalname) || `.${file.mimetype === 'image/png' ? 'png' : 'jpg'}`;
    const basename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${basename}${ext}`;
    const filepath = path.join(targetDir, filename);

    // 写入原图
    fs.writeFileSync(filepath, file.buffer);

    // 生成缩略图（同目录，_thumb 后缀）
    let thumbUrl: string | undefined;
    if (config.generateThumb) {
      const thumbFilename = `${basename}_thumb${ext}`;
      const thumbPath = path.join(targetDir, thumbFilename);
      await sharp(file.buffer)
        .resize(config.thumbSize, config.thumbSize, { fit: 'cover' })
        .toFile(thumbPath);
      thumbUrl = `/uploads/${config.subdir}/${thumbFilename}`;
    }

    return {
      url: `/uploads/${config.subdir}/${filename}`,
      thumbUrl,
    };
  }
}
