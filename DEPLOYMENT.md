# WenSai App 部署文档

Frontend 是事件消费者和 UI 渲染层，只访问 Backend。它不连接 AgentSDK，不消费 Hermes ACP 原始事件。

## 环境变量

Web 构建时指定 Backend API：

```bash
VITE_API_BASE_URL=https://your-domain.example.com/api
```

本地开发可使用默认 Vite proxy：

```ini
VITE_API_BASE_URL=/api
```

桌面端默认直连：

```text
http://127.0.0.1:8000/api
```

如果桌面端连接生产后端，也需要构建时设置 `VITE_API_BASE_URL`。

## Web 部署

```bash
npm install
VITE_API_BASE_URL=https://your-domain.example.com/api npm run build
```

产物目录：

```text
dist-app/
```

发布到 Nginx 静态目录：

```bash
rsync -av dist-app/ /var/www/wensai/
```

## Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.example.com;

    root /var/www/wensai;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 1024m;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```

## Tauri 桌面端

```bash
npm install
npm run tauri:build
```

产物目录：

```text
src-tauri/target/release/bundle/deb/
src-tauri/target/release/bundle/appimage/
```

开发运行：

```bash
npm run tauri:dev
```

## Android 发布

Android Release 必须签名后才能安装。GitHub Actions 需要在仓库 Secrets 中配置：

| Secret | 说明 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | release keystore 的 base64 内容 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 密码 |
| `ANDROID_KEY_ALIAS` | 签名 key alias |
| `ANDROID_KEY_PASSWORD` | 签名 key 密码 |

生成 keystore：

```bash
keytool -genkeypair -v \
  -keystore wensai-release.keystore \
  -alias wensai \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

写入 GitHub Secret：

```bash
base64 -w 0 wensai-release.keystore
```

Actions 会先生成 Tauri 的 unsigned release APK，再执行 `zipalign` 和 `apksigner`，最终上传：

```text
WenSai-android-universal-release.apk
```

## 实时任务页面

页面：

- `/agent-tasks/new`：创建 Agent 任务。
- `/agent-tasks/:id`：实时任务时间线。

进入任务详情页顺序：

1. `GET /tasks/{task_id}`
2. `GET /tasks/{task_id}/events`
3. `WS /ws/tasks/{task_id}/events?token=<access_token>`

WebSocket 消息格式：

```json
{"event":"task_event","data":{"id":1,"task_id":1,"type":"agent_message","content":"...","metadata":{},"created_at":"..."}}
```

前端按 `event.id` 去重。断线后重新拉：

```text
GET /tasks/{task_id}/events?after_event_id=<lastEventId>
```

审批操作走 HTTP：

```text
POST /tasks/{task_id}/approvals/{approval_id}/approve
POST /tasks/{task_id}/approvals/{approval_id}/reject
```

## 发布检查

```bash
npx tsc --noEmit
npm run build
npm run tauri:build
```

## 安全要求

- Frontend 不保存 internal token。
- Frontend 不连接 AgentSDK。
- Frontend 不依赖 Hermes ACP 原始事件。
- WebSocket query token 不应出现在生产访问日志中。
- 所有权限校验以 Backend 为准。
