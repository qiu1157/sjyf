import 'reflect-metadata';
import * as fs from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { resolveUploadRoot } from './config/upload.config';
import { resolveLogDir, resolveCertDir, resolveBackupDir, ensureRuntimeDirs } from './config/runtime-dirs.config';

type Severity = 'warn' | 'fatal';
interface RequiredCheck {
  key: keyof NodeJS.ProcessEnv;
  reason: string;
  severity?: Severity;
}

/**
 * 启动前关键环境变量自检。
 * 不阻断启动，但会把必须修正的配置错误用明显的前缀打印到宝塔终端日志，方便用户一眼定位。
 */
function validateCriticalEnv(): boolean {
  const checks: RequiredCheck[] = [
    { key: 'JWT_SECRET', reason: '缺省会导致所有登录态无法签发/解析，生产环境必须显式配置', severity: 'fatal' },
  ];
  const lines: string[] = [];
  lines.push('\n========== 启动自检：关键配置 ==========');
  let hasFatal = false;

  for (const item of checks) {
    const raw = process.env[item.key];
    if (!raw || (typeof raw === 'string' && raw.trim().length === 0)) {
      const sev = (item.severity || 'warn').toUpperCase();
      lines.push(`[${sev}] Missing Env: ${String(item.key)} —— ${item.reason}`);
      if ((item.severity || 'warn') === 'fatal') hasFatal = true;
    }
  }

  if ((process.env.DB_TYPE || 'sqlite').toLowerCase() === 'mysql') {
    const mysqlList: RequiredCheck[] = [
      { key: 'DB_HOST', reason: 'MySQL 模式必填', severity: 'warn' },
      { key: 'DB_PORT', reason: 'MySQL 模式必填', severity: 'warn' },
      { key: 'DB_USER', reason: 'MySQL 模式必填', severity: 'warn' },
      { key: 'DB_NAME', reason: 'MySQL 模式必填', severity: 'warn' },
      { key: 'DB_PASSWORD', reason: 'MySQL 模式必须配置密码', severity: 'fatal' },
    ];
    for (const item of mysqlList) {
      const raw = process.env[item.key];
      if (!raw || (typeof raw === 'string' && raw.trim().length === 0)) {
        const sev = (item.severity || 'warn').toUpperCase();
        lines.push(`[${sev}] Missing Env: ${String(item.key)} —— ${item.reason}`);
        if ((item.severity || 'warn') === 'fatal') hasFatal = true;
      }
    }
  }

  lines.push('[HINT] 环境变量三种注入方式（按优先级从高到低）：');
  lines.push('  ① 设置 ENV_FILE_PATH=<文件绝对路径>，可指向项目外任意生产配置文件');
  lines.push('  ② 写入 <项目根>/.env.production（NODE_ENV=production 时自动加载）');
  lines.push('  ③ 宝塔 Node 项目「环境变量」面板直接填');
  lines.push('========================================\n');

  console.warn(lines.join('\n'));
  return !hasFatal;
}

// 进程启动时间戳，供健康端点计算 uptimeSec
const PROCESS_START_AT = Date.now();

async function bootstrap() {
  // 1. 提前创建所有持久化目录（uploads/logs/cert/backup），避免首次启动写文件失败
  ensureRuntimeDirs(process.env, process.cwd());
  // 2. 关键配置自检（只诊断不阻断）
  validateCriticalEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  // 全局前缀 /api（仅对 @Controller() 装饰的路由生效；adapter 直挂路由需手动加 /api 前缀）
  app.setGlobalPrefix('api');

  // 健康检查：公开端点，不鉴权，供宝塔 PM2 + 发布脚本轮询
  // 注意：setGlobalPrefix 只对 @Controller() 生效，这里是直挂 adapter，必须手动加 /api 前缀
  const http = app.getHttpAdapter();
  http.get('/api/health', (_req: unknown, res: any) => {
    const now = Date.now();
    res.status(200).json({
      status: 'ok',
      uptimeSec: Math.floor((now - PROCESS_START_AT) / 1000),
      ts: new Date(now).toISOString(),
    });
  });

  // 静态资源：/uploads/* 直接映射到上传根目录（图片等）
  app.useStaticAssets(resolveUploadRoot(), {
    prefix: '/uploads/',
  });

  // 全局参数校验（只接受白名单字段 + 自动类型转换）
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // 全局响应包装（业务接口统一 {code/data/message} 格式）
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 全局异常过滤
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 文档
  const docCfg = new DocumentBuilder()
    .setTitle('拾家有方家政服务系统 API')
    .setDescription('用户端 / 领队端 / 管理后台 接口文档')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, docCfg);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 拾家有方后端服务启动成功: http://localhost:${port}`);
  console.log(`📖 API 文档地址: http://localhost:${port}/api/docs`);
  console.log(`🩺 健康检查地址: http://localhost:${port}/api/health`);
  console.log(`📁 日志目录: ${resolveLogDir(process.env, process.cwd())}`);
  console.log(`📁 上传目录: ${resolveUploadRoot(process.env, process.cwd())}`);
  console.log(`📁 证书目录: ${resolveCertDir(process.env, process.cwd())}`);
  console.log(`📁 备份目录: ${resolveBackupDir(process.env, process.cwd())}`);
}

bootstrap();
