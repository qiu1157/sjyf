import * as path from 'path';

export function resolveUploadRoot(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
) {
  const configuredRoot = env.UPLOAD_ROOT?.trim();
  if (!configuredRoot) {
    return path.join(cwd, 'uploads');
  }
  return path.isAbsolute(configuredRoot)
    ? configuredRoot
    : path.resolve(cwd, configuredRoot);
}
