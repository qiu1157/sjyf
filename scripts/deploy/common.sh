#!/usr/bin/env bash

set -euo pipefail

# 确保使用 Node.js v20+（项目依赖 NestJS 11 / sharp 等要求 Node >= 20）
# 宝塔面板安装的 Node 位于 /www/server/nodejs/vXX/bin，自动检测并加入 PATH
setup_node_path() {
  local current_node major
  current_node="$(command -v node 2>/dev/null || true)"
  major="0"
  [[ -n "$current_node" ]] && major="$("$current_node" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"

  if [[ "$major" -ge 20 ]]; then
    return 0
  fi

  # 在宝塔常见安装路径中查找 v20+ 的 Node
  local candidate
  for candidate in /www/server/nodejs/v20*/bin /www/server/nodejs/v21*/bin /www/server/nodejs/v22*/bin; do
    if [[ -x "$candidate/node" ]]; then
      export PATH="$candidate:$PATH"
      log_info "使用 Node: $($candidate/node -v) ($candidate)"
      return 0
    fi
  done

  die "未找到 Node.js v20+，当前 node 版本为 v${major}。请在宝塔面板安装 Node.js v20+。"
}

APP_ROOT="${APP_ROOT:-/www/wwwroot/shijia}"
SOURCE_DIR="${SOURCE_DIR:-$APP_ROOT/app}"
BACKEND_DIR="${BACKEND_DIR:-$APP_ROOT/backend}"
ADMIN_DIR="${ADMIN_DIR:-$APP_ROOT/sites/admin}"
MINIAPP_H5_DIR="${MINIAPP_H5_DIR:-$APP_ROOT/sites/h5}"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_ROOT/data/uploads}"
LOG_DIR="${LOG_DIR:-$APP_ROOT/backend/logs}"
BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/backup}"

REPO_URL="${REPO_URL:-https://github.com/qiu1157/sjyf.git}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-sjyf-backend}"
# 宝塔面板 Nginx 站点配置目录
NGINX_CONF_TARGET="${NGINX_CONF_TARGET:-/www/server/panel/vhost/nginx/0.default.conf}"

timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

log_info() {
  echo "[INFO] $(timestamp) $*"
}

log_warn() {
  echo "[WARN] $(timestamp) $*" >&2
}

log_error() {
  echo "[ERROR] $(timestamp) $*" >&2
}

die() {
  log_error "$*"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"
}

require_file() {
  [[ -f "$1" ]] || die "缺少文件：$1"
}

ensure_dir() {
  mkdir -p "$1"
}

current_branch() {
  local repo_dir="$1"
  git -C "$repo_dir" branch --show-current
}

copy_file() {
  local source_file="$1"
  local target_file="$2"

  ensure_dir "$(dirname "$target_file")"
  cp "$source_file" "$target_file"
}

replace_dir_contents() {
  local source_dir="$1"
  local target_dir="$2"

  ensure_dir "$target_dir"
  # 清理目标目录，但保留宝塔面板创建的 .user.ini（不可变属性，rm 会失败）
  find "$target_dir" -mindepth 1 -maxdepth 1 ! -name '.user.ini' -exec rm -rf {} +
  cp -R "$source_dir"/. "$target_dir"/
}

