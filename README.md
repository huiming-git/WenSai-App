# WenSai App

WenSai App 是问赛的前端工作台，支持 Web 浏览器和 Tauri 桌面端。它负责登录、工作区切换、沙盒对话、文件浏览、文件预览、截图、建议导出和实时任务展示。

前端只访问 Backend API。它不直接连接 AgentSDK，也不直接连接 Hermes 或官方 CubeSandbox。

## 技术栈

| 层 | 技术 |
| --- | --- |
| UI | React 19, TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS v4 |
| 路由 | React Router v7 |
| HTTP | Axios |
| 桌面端 | Tauri v2, Rust |
| 测试 | Playwright, ESLint |

## 架构位置

```text
WenSai-App
  -> Backend /api
  -> Backend /ws

Backend
  -> AgentSDK internal API

AgentSDK
  -> local-sandbox fallback
  -> official CubeSandbox API in production target
```

## 功能模块

- 认证：登录、注册、JWT 本地保存、401 自动回登录页。
- 工作台布局：左右侧栏、可拖动宽度、工作区切换、当前沙盒记忆。
- 沙盒对话：Ask / Agent 模式、模型参数、队列发送、审批/取消、实时输出。
- 文件管理：沙盒文件树、上传、新建、拖拽到对话输入、真实删除云端沙盒文件。
- 文件预览：文本、图片、PDF、Office 文档图片预览、页码和缩放。
- 本地缓存：IndexedDB 缓存文件与云端文档页图，Tauri 桌面端会额外写入本机 app data 目录。
- 截图：预览区域框选后复制剪贴板，并保存到对应沙盒文件。
- 建议导出：手动选择对话消息后导出建议。

## 本地开发

前置条件：

- Node.js 18+
- Backend 运行在 `http://127.0.0.1:8000`
- 如运行桌面端，需要 Rust 和 Tauri 依赖

安装：

```bash
npm ci
```

Web 开发：

```bash
npm run dev
```

默认 Vite 地址：

```text
http://127.0.0.1:1420
```

Vite 开发代理会把 `/api` 转发到 `http://localhost:8000`。生产构建必须显式指定 Backend：

```bash
VITE_API_BASE_URL=https://your-domain.example.com/api npm run build
```

桌面端开发：

```bash
npm run tauri:dev
```

## 常用命令

```bash
npm run dev          # Vite web dev server
npm run build        # Web 生产构建，输出 dist-app/
npm run preview      # 预览 dist-app
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E
npm run tauri:dev    # Tauri 开发
npm run tauri:build  # Tauri 安装包构建
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL。Web 生产必须设为 `https://域名/api` |

默认值在 [src/api/client.ts](./src/api/client.ts)：

```text
http://127.0.0.1:8000/api
```

## 目录结构

```text
src/
  api/                    Axios API 封装
  components/             Layout、文件树、对话流、基础 UI
  context/                Auth、Theme、Language、Workbench
  pages/                  登录、沙盒、历史、建议、文件预览等页面
  utils/                  文件缓存、文档预览缓存、拖拽、导出
  App.tsx                 路由入口
  main.tsx                React 挂载入口
src-tauri/
  src/lib.rs              Tauri 命令：读拖入文件、写本地预览缓存
  tauri.conf.json         Tauri 窗口、CSP、打包配置
tests/e2e/                Playwright 测试
```

## 路由

| 路径 | 页面 |
| --- | --- |
| `/login` | 登录 |
| `/register` | 注册 |
| `/` | 首页 |
| `/sandboxes` | 对话 / 当前沙盒工作区 |
| `/history` | 沙盒历史 |
| `/suggestions` | 建议导出 |
| `/workspace/files/:fileId` | 文件预览 |
| `/agent-tasks/new` | 创建 Agent 任务 |
| `/agent-tasks/:id` | 任务详情 |
| `/team-space` | 团队空间 |
| `/pricing` | 积分 |
| `/settings` | 设置 |

## 文件与缓存边界

- 云端/沙盒文件以 Backend 和 AgentSDK 为准，删除必须调用 Backend API，不能只删前端状态。
- 浏览器本地缓存位于 IndexedDB：
  - `wensai-local-file-cache`
  - `wensai-cloud-document-preview-cache`
- Tauri 桌面端会把预览文件写到 app data 下的 `local-files/task-{id}/file-{id}/...`。
- 本地缓存只用于预览和加速，不是云端文件源。

## 生产部署

Web 部署：

```bash
npm ci
VITE_API_BASE_URL=https://your-domain.example.com/api npm run build
sudo rsync -av dist-app/ /var/www/wensai/
```

Nginx 应该：

- 静态服务 `dist-app`
- 反向代理 `/api/` 到 Backend `127.0.0.1:8000`
- 反向代理 `/ws/` 到 Backend WebSocket

完整生产说明见仓库根目录 [PRODUCTION_DEPLOYMENT.md](../PRODUCTION_DEPLOYMENT.md)。

## 维护注意

- 新接口先改 `src/api/*` 和 `src/types.ts`，再接页面。
- 文件拖拽统一使用 `src/utils/sandboxFileDrag.ts`。
- 文档/PDF/PPT 预览缓存逻辑集中在 `WorkspacePreviewPage.tsx` 和 `src/utils/localDocumentPreview.ts`。
- 不要在前端保存 `INTERNAL_API_TOKEN`。
- 不要让前端直接访问 AgentSDK、Hermes 或 CubeSandbox。
