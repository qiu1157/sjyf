import * as fs from 'node:fs';
import * as path from 'node:path';

/** 解析日志目录：默认 ./logs，可用 LOG_DIR 覆盖（支持相对/绝对路径） */
export function resolveLogDir(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): string {
  const configured = env.LOG_DIR?.trim();
  if (!configured) return path.join(cwd, 'logs');
  return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
}

/** 解析支付私钥/证书目录：默认 ./cert，可用 CERT_DIR 覆盖 */
export function resolveCertDir(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): string {
  const configured = env.CERT_DIR?.trim();
  if (!configured) return path.join(cwd, 'cert');
  return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
}

/** 解析备份目录：默认 ./backup，可用 BACKUP_DIR 覆盖 */
export function resolveBackupDir(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): string {
  const configured = env.BACKUP_DIR?.trim();
  if (!configured) return path.join(cwd, 'backup');
  return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
}

/**
 * 确保上传、日志、证书、备份四个运行时持久化目录都存在。
 * 不存在则递归创建。注意：只负责创建，不负责权限；权限由运维按部署手册调整。
 */
export function ensureRuntimeDirs(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): void {
  const dirs = [
    // upload.config.ts 里同样的 resolveUploadRoot
    resolveUploadRootCompat(env, cwd),
    resolveLogDir(env, cwd),
    resolveCertDir(env, cwd),
    resolveBackupDir(env, cwd),
  ];
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      // 非致命：创建失败打 warn，后续真正写的时候会再报 EACCES 让用户看到明确错误
      console.warn(`[ensureRuntimeDirs] 创建目录失败: ${dir}。错误: ${(e as Error).message}`);
    }
  }
}

/**
 * 与 upload.config.ts 中 resolveUploadRoot 相同的逻辑复写一遍，
 * 避免在运行时目录配置文件里 import upload.config.ts（否则会引入不必要的依赖）。
 * 若后续 upload.config.ts 变化，此处也要同步。
 */
function resolveUploadRootCompat(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): string {
  const configured = env.UPLOAD_ROOT?.trim();
  if (!configured) return path.join(cwd, 'uploads');
  return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
}
