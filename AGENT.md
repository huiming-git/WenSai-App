# WenSai App Agent Guide

本文面向维护本前端工程的代码 Agent。目标是保护现有边界，减少 UI 和文件链路回归。

## 工程职责

WenSai-App 是 UI 层，只负责：

- 渲染工作台、沙盒对话、文件树、预览和建议导出。
- 调用 Backend 的 `/api` 和 `/ws`。
- 在浏览器 IndexedDB / Tauri app data 中做本地预览缓存。

它不负责：

- 执行 Agent runtime。
- 调用 AgentSDK internal API。
- 调用 Hermes ACP。
- 调用官方 CubeSandbox。
- 持有 `INTERNAL_API_TOKEN`。

## 关键边界

```text
Frontend -> Backend public API only
Backend -> AgentSDK internal API
AgentSDK -> sandbox/runtime
```

所有沙盒文件删除、上传、创建都必须通过 Backend API。前端不能只更新 React state 来模拟成功。

## 重要文件

| 路径 | 说明 |
| --- | --- |
| `src/api/client.ts` | Axios base URL、JWT 注入、401 处理 |
| `src/api/tasks.ts` | 任务、审批、文件 API |
| `src/api/files.ts` | 工作区文件、预览、下载 API |
| `src/api/workspaces.ts` | 工作区 API |
| `src/types.ts` | Backend 响应类型 |
| `src/components/Layout.tsx` | 主工作台、左右侧栏、当前沙盒和预览选择 |
| `src/components/WorkspaceExplorer.tsx` | 沙盒文件树、上传、新建、删除、拖拽、截图入口 |
| `src/pages/SandboxWorkspacePage.tsx` | 右侧对话栏、输入、对话列表、任务串联 |
| `src/components/AgentTaskConversation.tsx` | 单任务事件流、审批、手动建议 |
| `src/pages/WorkspacePreviewPage.tsx` | 文件预览、文档页图缓存、截图、更新提示 |
| `src/utils/localFileCache.ts` | 原文件本地缓存 |
| `src/utils/localDocumentPreview.ts` | PDF/PPT/Word 页图缓存 |
| `src/utils/sandboxFileDrag.ts` | 沙盒文件拖拽协议 |
| `src-tauri/src/lib.rs` | Tauri native commands |

## UI 规则

- 优先沿用 `WensaiUI.tsx` 的 `Icon`、`Panel`、`NavItem` 等组件。
- 操作按钮优先用图标，必要时加简短文字和 `title`。
- 不要添加大段说明性 guide 文案到工作台主界面。
- 文件/对话/预览属于工具型 UI，保持密度和可扫读性。
- 任何新文案应短，避免占用核心操作区域。
- 右侧对话栏和文件预览必须适配窄宽度，文本要 truncate 或换行。

## 状态与缓存

- 登录 token 存在 `localStorage.token`。
- 布局状态、当前沙盒、导航顺序存储在 `localStorage`，key 在 `Layout.tsx` 顶部集中定义。
- 手动建议存储在 `manualSuggestions.ts`。
- 文件缓存存储在 IndexedDB；桌面端额外通过 Tauri command 写入本机路径。
- 缓存命中不代表云端文件存在，所有真实文件状态以 Backend 为准。

## 文件链路

- 上传文件：`uploadTaskFile` -> Backend `/api/tasks/{task_id}/files` -> Backend 转发 AgentSDK sandbox。
- 新建文件：`createTaskFile` -> Backend 创建存储记录并转发 AgentSDK。
- 删除文件：`deleteTaskFile` -> Backend 删除 storage 和 AgentSDK sandbox 文件。
- 拖到对话输入：`WorkspaceExplorer` 写 drag payload，`ConversationInput` 解析 payload 并附加为输入。
- 截图：`WorkspacePreviewPage` 框选图片，复制剪贴板，并通过 `uploadTaskFile` 保存到 `screenshots/`。

改这些链路时必须检查真实 API 调用是否存在，不能只改前端列表。

## 预览链路

`WorkspacePreviewPage` 的预览策略：

- 文本：下载 blob，读取文本。
- 图片：下载 blob，object URL 显示。
- PDF/Office：Backend 生成页图，前端下载页图到 IndexedDB，后续用 hash/signature 判断缓存是否有效。
- 更新按钮：检查缓存，有变化才重新同步，并显示成功/失败浮层。

注意释放 object URL，避免内存泄漏。

## WebSocket

任务事件使用：

```text
GET /api/tasks/{task_id}/events
WS  /ws/tasks/{task_id}/events?token=<jwt>
```

前端按 `event.id` 去重。断线后应重新拉 HTTP events。

## 本地运行

```bash
npm ci
npm run dev
```

Backend 默认需要运行在：

```text
http://127.0.0.1:8000
```

## 验证

常规改动至少运行：

```bash
npm run lint
npm run build
```

涉及路由/登录/主流程时再运行：

```bash
npm run test:e2e
```

涉及 Tauri command 或桌面缓存时运行：

```bash
npm run tauri:build
```

## 禁止事项

- 不要在前端引入 AgentSDK base URL 或 internal token。
- 不要用 mock/fake runtime 伪造 Agent 执行结果。
- 不要只删除前端状态来表示文件已删除。
- 不要把本地缓存当作云端文件源。
- 不要把官方 CubeSandbox 文案写进前端执行逻辑；前端不关心 runtime 实现。
