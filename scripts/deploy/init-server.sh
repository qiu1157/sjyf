#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

BRANCH="${1:-$DEFAULT_BRANCH}"

usage() {
  cat <<EOF
用法：
  bash scripts/deploy/init-server.sh [branch]

示例：
  bash scripts/deploy/init-server.sh
  bash scripts/deploy/init-server.sh main
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_cmd git
require_cmd node
require_cmd npm
require_cmd pm2
require_cmd nginx

log_info "准备服务器目录..."
ensure_dir "$APP_ROOT"
ensure_dir "$BACKEND_DIR"
ensure_dir "$ADMIN_DIR"
ensure_dir "$MINIAPP_H5_DIR"
ensure_dir "$UPLOADS_DIR"
ensure_dir "$LOG_DIR"
ensure_dir "$BACKUP_DIR"

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  log_info "首次克隆 GitHub 仓库到 $SOURCE_DIR ..."
  git clone -b "$BRANCH" "$REPO_URL" "$SOURCE_DIR"
else
  log_info "检测到已存在源码目录，执行远端同步..."
  git -C "$SOURCE_DIR" fetch --all --prune
  git -C "$SOURCE_DIR" checkout "$BRANCH"
  git -C "$SOURCE_DIR" pull --ff-only origin "$BRANCH"
fi

if [[ -f "$BACKEND_DIR/.env.production" ]]; then
  log_info "检测到后端生产配置：$BACKEND_DIR/.env.production"
else
  log_warn "未检测到 $BACKEND_DIR/.env.production，请先在服务器准备生产环境变量。"
fi

log_info "初始化完成。"
log_info "源码目录：$SOURCE_DIR"
log_info "默认分支：$BRANCH"

