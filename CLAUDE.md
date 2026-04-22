# CLAUDE.md — WenSai Frontend

## 项目概述

问赛（WenSai）前端，React 19 + Tauri v2 桌面应用。赛事材料评审工作台，支持 Web 和桌面两种运行方式。

## 开发命令

```bash
npm run dev          # Vite 开发服务器 http://localhost:5173
npm run tauri:dev    # Tauri 桌面开发（自动启动 Vite + 桌面窗口）
npm run build        # Web 生产构建 → dist-app/
npm run tauri:build  # 桌面安装包 → src-tauri/target/release/bundle/nsis/
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E 测试
```

## 架构要点

- **路由**: React Router v7，公开路由（/login, /register）+ ProtectedRoute 包裹的认证路由
- **状态管理**: AuthContext（JWT + 用户信息）+ LanguageContext（i18n）+ React Query（服务端状态）
- **API 层**: `src/api/` 下 axios 客户端，自动附加 JWT token，baseURL 指向后端
- **Tauri**: 自定义标题栏（`TitleBar.tsx`），无原生装饰，通过 `@tauri-apps/api/window` 控制窗口
- **样式**: Tailwind CSS v4，无额外 UI 库，自定义组件在 `WensaiUI.tsx`

## 关键文件

- `src/App.tsx` — 路由定义，Tauri 环境检测 + 自定义标题栏
- `src/components/Layout.tsx` — 侧边栏 + 主内容区布局
- `src/components/TitleBar.tsx` — Tauri 自定义标题栏（拖拽 + 最小化/最大化/关闭）
- `src/api/client.ts` — axios 实例，请求/响应拦截器
- `src/context/AuthContext.tsx` — 登录/登出/token 管理
- `src-tauri/tauri.conf.json` — Tauri 窗口、CSP、打包配置
- `src-tauri/capabilities/default.json` — Tauri 权限声明

## 后端连接

- 开发模式：Vite 代理 `/api` → `http://localhost:8000`
- Tauri 模式：CSP 允许 `connect-src http://127.0.0.1:8000 http://localhost:8000`
- 后端为独立仓库，需单独启动

## i18n

- 语言文件：`src/locales/zh.ts`（中文）、`src/locales/en.ts`（英文）
- 通过 `LanguageContext` 切换，`useLanguage()` hook 使用

## Tauri 权限

`src-tauri/capabilities/default.json` 中声明：
- `core:default` — 基础权限
- `core:window:allow-minimize` / `allow-toggle-maximize` / `allow-close` / `allow-start-dragging` — 窗口控制

## 注意事项

- 不要提交 `node_modules/`、`dist/`、`dist-app/`、`src-tauri/target/`、`src-tauri/gen/`
- Tauri 桌面开发需要 Rust 工具链
- 环境检测 `'__TAURI_INTERNALS__' in window` 判断是否在 Tauri 中运行
- sharp 是 devDependency，仅用于图标处理脚本，不影响运行时
