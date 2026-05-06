# WenSai 修改版前端最终交付包

本包是给后端对接使用的最终前端包，来源为：

`E:\agent\WenSai-App`

## 包内内容

- `src/`：修改后的 React 前端源码
- `dist-app/`：最新编译后的静态前端产物
- `public/`：静态资源
- `scripts/`：项目脚本
- `src-tauri/`：Tauri 桌面壳源码与配置，不含 `target` 编译缓存
- `tests/`：Playwright e2e 测试
- `package.json` / `package-lock.json`：依赖与脚本
- `vite.config.js`：开发代理配置

已排除：

- `node_modules/`
- `playwright-report/`
- `test-results/`
- `src-tauri/target/`
- 运行日志

## 后端对接地址

浏览器开发模式：

- 前端请求：`/api/...`
- Vite 代理：`http://localhost:8000`

Tauri 桌面模式：

- 默认请求：`http://127.0.0.1:8000/api`

如果后端地址不同，可以在构建前设置：

```powershell
$env:VITE_API_BASE_URL="http://你的后端地址/api"
npm run build
```

## 需要后端提供的接口

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/papers`
- `POST /api/papers`
- `POST /api/papers/{id}/upload`
- `GET /api/papers/{id}`
- `GET /api/papers/{id}/reviews`
- `POST /api/papers/{id}/ai-review`

## 本次前端修改点

- 首页合并材料名称、材料文件、修改目标、赛事选择
- 首页可直接上传 PPT/材料文件
- `修改目标` 改为 placeholder 背景提示，不再默认填入真实内容
- 留空提交时仍按默认检查命令发送
- 发送后创建材料、保存历史并跳转建议页
- 建议页直接显示 AI/预置修改建议，支持 Word、PDF、复制导出
- 上传新材料会清空当前草稿并回首页
- 历史命令可重新打开建议页
- 赛事按钮补全为创新大赛、挑战杯科技作品、挑战杯创业计划赛
- 收费页改为积分制度展示
- 修复普通浏览器中 Tauri API 导致页面空白的问题

## 验证结果

- `npm run build`：通过
- `npm run lint`：通过
- `npm run test:e2e`：此前已通过 12/12
- Tauri 构建此前已通过，可生成 Windows 安装包

邀请码按需求图为：

`huiming`
