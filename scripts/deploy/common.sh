#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/www/wwwroot/shijia}"
SOURCE_DIR="${SOURCE_DIR:-$APP_ROOT/app}"
BACKEND_DIR="${BACKEND_DIR:-$APP_ROOT/backend}"
ADMIN_DIR="${ADMIN_DIR:-$APP_ROOT/sites/admin}"
MINIAPP_H5_DIR="${MINIAPP_H5_DIR:-$APP_ROOT/sites/h5}"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_ROOT/data/uploads}"
LOG_DIR="${LOG_DIR:-$APP_ROOT/backend/logs}"
BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/backup}"

REPO_URL="${REPO_URL:-git@github.com:qiu1157/sjyf.git}"
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
  find "$target_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -R "$source_dir"/. "$target_dir"/
}

