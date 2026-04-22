# 问赛 WenSai — Frontend

React 19 + Tauri v2 桌面客户端，赛事材料评审工作台。

## 技术栈

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS v4** + 自定义组件
- **React Router v7** + **React Query**
- **Tauri v2** 桌面应用（NSIS 安装包）
- **Playwright** E2E 测试
- 中英双语 i18n

## 快速开始

```bash
npm install
npm run dev          # 浏览器开发 http://localhost:5173
npm run tauri:dev    # Tauri 桌面开发（需 Rust 工具链）
npm run build        # Web 生产构建
npm run tauri:build  # 桌面安装包
```

后端需单独启动（默认连接 `http://localhost:8000`）。

## 项目结构

```
frontend/
├── src/
│   ├── pages/           # 9 个页面
│   │   ├── LoginPage        # 登录
│   │   ├── RegisterPage     # 注册（邀请码）
│   │   ├── DashboardPage    # 仪表盘
│   │   ├── PaperListPage    # 论文列表
│   │   ├── PaperDetailPage  # 论文详情 + 评审
│   │   ├── PaperUploadPage  # 上传论文
│   │   ├── ReviewFormPage   # 提交评审
│   │   ├── PricingPage      # 收费说明
│   │   └── SettingsPage     # 设置
│   ├── components/      # Layout · TitleBar · WensaiUI · ProtectedRoute
│   ├── api/             # auth · papers · reviews（axios）
│   ├── context/         # AuthContext · LanguageContext
│   ├── hooks/           # React Query hooks
│   ├── locales/         # zh.ts · en.ts
│   ├── utils/           # export · history · tauri
│   └── data/            # 常量
├── src-tauri/           # Tauri 配置 + Rust 入口
│   ├── tauri.conf.json  # 窗口、CSP、打包配置
│   ├── capabilities/    # 权限声明
│   └── icons/           # 应用图标
├── tests/e2e/           # Playwright 测试
└── public/              # 静态资源
```

## Tauri 桌面应用

- 自定义标题栏（无原生装饰）
- 窗口尺寸 1180x760，最小 960x640
- CSP 限制只允许连接 localhost:8000 后端
- 打包目标：NSIS（Windows 安装包）

构建桌面安装包：

```bash
npm run tauri:build
```

输出在 `src-tauri/target/release/bundle/nsis/`。

## 环境要求

- Node.js >= 18
- Rust 工具链（仅 Tauri 桌面端需要）
- 后端运行在 http://localhost:8000

## License

MIT
