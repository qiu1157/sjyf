# 拾家有方 GitHub 拉取式代码部署说明

## 一、适用范围

- 本文档只处理系统代码更新部署
- 本文档不包含数据库部署、数据库迁移与数据库写操作
- 当前生产 MySQL、`.env.production`、`uploads` 目录保持现状，不因本流程被覆盖

## 二、目录约定

| 目录 | 用途 |
|------|------|
| `/srv/shijia/app` | GitHub 拉取式源码目录 |
| `/srv/shijia/backend` | 后端运行目录 |
| `/srv/shijia/admin` | 后台静态文件目录 |
| `/srv/shijia/miniapp-h5` | H5 静态文件目录 |
| `/srv/shijia/uploads` | 上传文件持久化目录 |

## 三、前置条件

- 服务器已安装 `git`、`node`、`npm`、`pm2`、`nginx`
- 服务器已配置 GitHub SSH 免密登录
- 服务器本地已准备好 `/srv/shijia/backend/.env.production`
- 当前仓库已推送到 GitHub，默认远端为 `git@github.com:qiu1157/sjyf.git`

## 四、首次初始化

在服务器执行：

```bash
cd /srv/shijia
bash /path/to/repo/scripts/deploy/init-server.sh main
```

说明：

- `init-server.sh` 会创建标准目录
- 若 `/srv/shijia/app` 不存在，会执行 `git clone`
- 若目录已存在，则会执行一次 `git fetch/pull`

## 五、日常代码发布

在服务器执行：

```bash
cd /srv/shijia/app
bash scripts/deploy/deploy-code.sh main
```

脚本会完成以下动作：

1. 拉取 GitHub 最新代码
2. 构建 `backend`
3. 构建 `admin`
4. 构建 `miniapp` H5
5. 同步运行产物到既有运行目录
6. 执行 `nginx -t && systemctl reload nginx`
7. 重启 `pm2` 中的 `sjyf-backend`

## 六、发布后检查

至少验证以下地址：

- `http://<公网IP>/`
- `http://<公网IP>/api/docs`
- `http://<公网IP>:8081/`
- `http://<公网IP>:8081/api/services/banner`
- `http://<公网IP>/uploads/...`

至少验证以下进程状态：

```bash
pm2 status
nginx -t
```

## 七、回滚方法

若发布后发现代码异常，可执行以下回滚：

```bash
cd /srv/shijia/app
git log --oneline -n 5
git checkout <目标提交或标签>
bash scripts/deploy/deploy-code.sh
```

说明：

- 该回滚只回滚代码版本
- 不回滚数据库
- 不回滚 `uploads`

## 八、注意事项

- 生产部署只认可 GitHub 上已经提交并推送的代码
- 本地未提交、未推送的改动不会进入服务器发布
- `deploy-code.sh` 默认不会覆盖 `.env.production`
- `deploy-code.sh` 默认不会修改 `/srv/shijia/uploads`
- 如依赖有变更，脚本会重新执行 `npm install`

