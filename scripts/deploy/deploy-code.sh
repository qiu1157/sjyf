#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

BRANCH="${1:-$DEFAULT_BRANCH}"
SOURCE_BACKEND_DIR="$SOURCE_DIR/backend"
SOURCE_ADMIN_DIR="$SOURCE_DIR/admin"
SOURCE_MINIAPP_DIR="$SOURCE_DIR/miniapp"
SOURCE_NGINX_CONF="$SOURCE_DIR/deploy/nginx.shijia.conf"

usage() {
  cat <<EOF
用法：
  bash scripts/deploy/deploy-code.sh [branch]

示例：
  bash scripts/deploy/deploy-code.sh
  bash scripts/deploy/deploy-code.sh main
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_cmd git
require_cmd npm
require_cmd pm2
require_cmd nginx
require_cmd systemctl

[[ -d "$SOURCE_DIR/.git" ]] || die "未找到源码目录 $SOURCE_DIR，请先执行 init-server.sh"

log_info "拉取 GitHub 最新代码..."
git -C "$SOURCE_DIR" fetch --all --prune
git -C "$SOURCE_DIR" checkout "$BRANCH"
git -C "$SOURCE_DIR" pull --ff-only origin "$BRANCH"

CURRENT_COMMIT="$(git -C "$SOURCE_DIR" rev-parse --short HEAD)"
CURRENT_BRANCH="$(current_branch "$SOURCE_DIR")"
log_info "当前分支：$CURRENT_BRANCH"
log_info "当前提交：$CURRENT_COMMIT"

require_file "$SOURCE_BACKEND_DIR/package.json"
require_file "$SOURCE_ADMIN_DIR/package.json"
require_file "$SOURCE_MINIAPP_DIR/package.json"
require_file "$BACKEND_DIR/.env.production"

log_info "检测到后端生产配置：$BACKEND_DIR/.env.production"
log_info "构建后端..."
(
  cd "$SOURCE_BACKEND_DIR"
  npm install --legacy-peer-deps
  npm run build
)

log_info "同步后端运行文件..."
copy_file "$SOURCE_BACKEND_DIR/package.json" "$BACKEND_DIR/package.json"
copy_file "$SOURCE_BACKEND_DIR/package-lock.json" "$BACKEND_DIR/package-lock.json"
# 宝塔官方推荐主入口为 .cjs（CommonJS，不会被宝塔插件改写出现 Unexpected token ')'）
if [[ -f "$SOURCE_BACKEND_DIR/ecosystem.config.cjs" ]]; then
  copy_file "$SOURCE_BACKEND_DIR/ecosystem.config.cjs" "$BACKEND_DIR/ecosystem.config.cjs"
  # 老 PM2 启动命令若仍引用 ecosystem.config.js，保留一份软链/拷贝兜底，避免切完新代码 PM2 restart 找不到文件
  if [[ -f "$SOURCE_BACKEND_DIR/ecosystem.config.js" ]]; then
    copy_file "$SOURCE_BACKEND_DIR/ecosystem.config.js" "$BACKEND_DIR/ecosystem.config.js"
  fi
elif [[ -f "$SOURCE_BACKEND_DIR/ecosystem.config.js" ]]; then
  copy_file "$SOURCE_BACKEND_DIR/ecosystem.config.js" "$BACKEND_DIR/ecosystem.config.js"
  log_warn "仅发现 ecosystem.config.js（deprecated，宝塔 Node 项目 v6 可能被改写非法 JS），建议尽快改为 .cjs 作为主入口。"
else
  log_warn "未找到 ecosystem.config.{cjs,js}，保留服务器现有 PM2 配置不变。"
fi
(
  cd "$BACKEND_DIR"
  npm install --omit=dev --legacy-peer-deps

  # 兼容历史仓库尚未补齐 mysql2 依赖、但服务器生产环境已运行在 MySQL 模式的场景。
  if [[ -f ".env.production" ]] && grep -Eq '^DB_TYPE=mysql$|^DB_TYPE="mysql"$' ".env.production"; then
    if ! node -e "require.resolve('mysql2/package.json')" >/dev/null 2>&1; then
      log_warn "检测到生产环境使用 MySQL，但当前依赖中缺少 mysql2，自动补装运行时驱动。"
      npm install mysql2 --no-save --omit=dev --legacy-peer-deps
    fi
  fi
)
replace_dir_contents "$SOURCE_BACKEND_DIR/dist" "$BACKEND_DIR/dist"

log_info "构建后台管理端..."
(
  cd "$SOURCE_ADMIN_DIR"
  npm install
  npm run build
)

log_info "同步后台静态产物..."
replace_dir_contents "$SOURCE_ADMIN_DIR/dist" "$ADMIN_DIR/dist"

log_info "构建小程序 H5..."
(
  cd "$SOURCE_MINIAPP_DIR"
  npm install
  npm run build:h5
)

log_info "同步 H5 静态产物..."
replace_dir_contents "$SOURCE_MINIAPP_DIR/dist/build/h5" "$MINIAPP_H5_DIR/dist"

if [[ -f "$SOURCE_NGINX_CONF" ]]; then
  log_info "同步 Nginx 配置..."
  copy_file "$SOURCE_NGINX_CONF" "$NGINX_CONF_TARGET"
else
  log_warn "未找到 $SOURCE_NGINX_CONF，保留服务器现有 Nginx 配置不变。"
fi

log_info "校验并重载 Nginx..."
nginx -t
systemctl reload nginx

log_info "重启后端进程..."
pm2 restart "$BACKEND_PM2_NAME" --update-env

log_info "发布完成。"
log_info "分支：$CURRENT_BRANCH"
log_info "提交：$CURRENT_COMMIT"
pm2 status "$BACKEND_PM2_NAME"
