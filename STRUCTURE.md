# Humanly — 项目结构详解

## 概述

Humanly 是一个**文本溯源服务**，用于追踪用户在外部表单/问卷中的输入行为，生成打字行为分析报告，并颁发可验证的真实性证书（Certificate of Authenticity）。

整体是一个 **npm 工作区 Monorepo**，包含 6 个 package，通过 Docker Compose 部署。

---

## 目录树

```
humanly/
├── package.json                    # 根工作区配置，统一脚本入口
├── tsconfig.json                   # 根 TypeScript 配置（project references）
├── .env                            # 生产环境变量（不提交 git）
├── .env.example                    # 环境变量模板
├── .dockerignore                   # 排除 dist/、.next/、*.tsbuildinfo
├── .npmrc                          # npm 配置
├── .gitignore
│
├── docker-compose.yml              # 开发用（本地 PostgreSQL + Redis）
├── docker-compose.dev.yml          # 开发用（同上，备用）
├── docker-compose.prod.yml         # 生产部署（全栈，含 nginx）
│
├── docker/
│   ├── backend.Dockerfile          # 后端多阶段构建镜像
│   ├── frontend-user.Dockerfile    # 用户门户多阶段构建镜像
│   └── frontend.Dockerfile         # 管理后台构建镜像（未部署）
│
├── nginx/
│   ├── nginx.conf                  # nginx 主配置（WebSocket upgrade map）
│   ├── default.conf                # 当前激活的 nginx 站点配置
│   ├── default.conf.http-only      # HTTP-only 配置（申请证书时使用）
│   └── default.conf.https-final    # HTTPS 完整配置（证书就绪后激活）
│
├── storage/
│   └── papers/                     # PDF 论文上传存储（按 UUID 分目录）
│
└── packages/
    ├── backend/                    # Express.js REST API + Socket.IO
    ├── frontend/                   # Next.js 14 管理后台（Admin Dashboard）
    ├── frontend-user/              # Next.js 14 用户门户
    ├── editor/                     # Lexical 富文本编辑器（带事件追踪）
    ├── shared/                     # 共享 TypeScript 类型 + Zod 验证
    └── tracker/                    # 轻量级嵌入式追踪库（<15KB JS）
```

---

## 各 Package 详解

### 1. `packages/backend` — 后端 API 服务

**技术栈**：Node.js 20 / Express.js / Socket.IO / PostgreSQL（TimescaleDB）/ Redis

**端口**：3001（内部，不对外暴露）

```
packages/backend/
├── package.json
├── tsconfig.json
├── .env.example
│
└── src/
    ├── index.ts                    # 入口（初始化 DB 连接、启动 server）
    ├── app.ts                      # Express app 工厂：注册中间件和路由
    ├── server.ts                   # 创建 HTTP server，挂载 Socket.IO
    │
    ├── config/
    │   ├── env.ts                  # 环境变量校验与导出（类型安全）
    │   ├── database.ts             # PostgreSQL 连接池（pg Pool）
    │   └── redis.ts                # Redis 客户端初始化
    │
    ├── routes/                     # 路由层（仅定义 URL 映射）
    │   ├── auth.routes.ts          # /api/v1/auth/*
    │   ├── projects.routes.ts      # /api/v1/projects/*
    │   ├── documents.routes.ts     # /api/v1/documents/*
    │   ├── certificates.routes.ts  # /api/v1/certificates/*
    │   ├── events.routes.ts        # /api/v1/events/*（追踪事件）
    │   ├── tracker.routes.ts       # /tracker/*（静态 JS + 追踪端点）
    │   ├── analytics.routes.ts     # /api/v1/analytics/*
    │   ├── ai.routes.ts            # /api/v1/ai/*
    │   ├── paper.routes.ts         # /api/v1/papers/*（论文管理）
    │   ├── review.routes.ts        # /api/v1/reviews/*（同行评审）
    │   └── export.routes.ts        # /api/v1/export/*
    │
    ├── controllers/                # 控制器层（处理 HTTP req/res）
    │   ├── auth.controller.ts
    │   ├── document.controller.ts
    │   ├── certificate.controller.ts
    │   ├── analytics.controller.ts
    │   ├── ai.controller.ts
    │   ├── ai-settings.controller.ts
    │   ├── paper.controller.ts
    │   ├── review.controller.ts
    │   ├── tracker.controller.ts
    │   ├── events.controller.ts
    │   ├── export.controller.ts
    │   └── project.controller.ts
    │
    ├── services/                   # 业务逻辑层
    │   ├── auth.service.ts         # 注册、登录、JWT 签发、密码重置
    │   ├── document.service.ts     # 文档 CRUD、内容存储
    │   ├── certificate.service.ts  # 证书生成、验证 token、PDF 生成
    │   ├── analytics.service.ts    # 打字行为统计分析
    │   ├── ai.service.ts           # AI 助手（支持多种 provider）
    │   ├── email.service.ts        # 邮件发送（console/SendGrid）
    │   ├── event.service.ts        # 追踪事件存储与查询
    │   ├── export.service.ts       # 数据导出（CSV/JSON）
    │   ├── paper.service.ts        # 论文管理
    │   ├── paper-storage.service.ts # PDF 文件存储
    │   ├── pdf.service.ts          # PDF 解析
    │   ├── project.service.ts      # 项目（追踪项目）管理
    │   ├── review.service.ts       # 同行评审工作流
    │   └── reviewer.service.ts     # 评审人管理
    │
    ├── models/                     # 数据访问层（原生 SQL，无 ORM）
    │   ├── user.model.ts
    │   ├── document.model.ts
    │   ├── certificate.model.ts
    │   ├── event.model.ts
    │   ├── document-event.model.ts
    │   ├── project.model.ts
    │   ├── session.model.ts
    │   ├── refresh-token.model.ts
    │   ├── ai.model.ts
    │   ├── ai-selection-action.model.ts
    │   ├── user-ai-settings.model.ts
    │   ├── paper.model.ts
    │   ├── paper-reviewer.model.ts
    │   ├── review.model.ts
    │   └── review-comment.model.ts
    │
    ├── middleware/
    │   ├── auth.middleware.ts      # JWT 验证，附加 req.user
    │   ├── error-handler.ts        # 统一错误处理
    │   ├── rate-limit.ts           # Redis 速率限制
    │   ├── review-auth.middleware.ts # 评审人权限校验
    │   └── tracking.middleware.ts  # 追踪请求处理
    │
    ├── websocket/                  # Socket.IO 实时通信
    │   ├── index.ts
    │   ├── socket-server.ts        # Socket.IO 服务初始化
    │   └── handlers/
    │       ├── live-preview.handler.ts  # 实时打字预览推送
    │       └── ai.handler.ts            # AI 流式响应推送
    │
    ├── utils/
    │   ├── jwt.ts                  # JWT 签发与验证工具
    │   ├── crypto.ts               # 加密工具
    │   ├── logger.ts               # 日志工具（Winston）
    │   └── websocket.ts            # WebSocket 工具函数
    │
    └── db/
        └── migrations/             # SQL 迁移文件（按顺序执行）
            ├── 001_initial_schema.sql      # 核心表：users, projects, events（TimescaleDB 超表）
            ├── 002_user_documents.sql      # 文档表
            ├── 003_add_certificate_options.sql
            ├── 004_add_access_code_plaintext.sql
            ├── 005_ai_assistant.sql        # AI 对话历史
            ├── 005-peer-review-schema.sql  # 同行评审
            ├── 006-paper-document-link.sql
            ├── 007_ai_authorship_statistics.sql
            └── 008_user_ai_settings.sql    # 用户 AI 配置
```

**关键设计**：
- `events` 表是 **TimescaleDB 超表**，按天分区，高效存储海量打字事件
- CORS 分两类：`/tracker` 和 `/api/v1/track` 允许任何来源（`origin: *`），其他接口使用白名单
- 访问令牌（Access Token）通过 `Authorization: Bearer` 传递，刷新令牌（Refresh Token）存于 httpOnly Cookie
- AI 服务支持多种 provider（OpenAI/Claude/Gemini），API Key 由用户在界面中配置，加密存储

---

### 2. `packages/frontend-user` — 用户门户

**技术栈**：Next.js 14 App Router / Tailwind CSS / shadcn/ui / Zustand / Socket.IO Client

**端口**：3002（内部）/ 生产通过 nginx `/` 路由

```
packages/frontend-user/
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── jest.config.js                  # Jest + React Testing Library
├── jest.setup.ts
│
├── public/
│   ├── humanly.svg
│   ├── icon.svg
│   └── pdf.worker.min.js           # PDF.js worker（本地托管）
│
└── src/
    ├── app/                        # Next.js App Router 页面
    │   ├── layout.tsx              # 根布局（字体、Toaster）
    │   ├── globals.css
    │   ├── page.tsx                # 首页（重定向到 /documents）
    │   │
    │   ├── (auth)/                 # 认证路由组（无导航栏布局）
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx      # 登录页
    │   │   ├── register/page.tsx   # 注册页
    │   │   ├── forgot-password/page.tsx
    │   │   ├── reset-password/page.tsx
    │   │   ├── verify-email/page.tsx
    │   │   └── check-email/page.tsx
    │   │
    │   ├── documents/              # 文档管理
    │   │   ├── layout.tsx
    │   │   ├── page.tsx            # 文档列表
    │   │   └── [id]/page.tsx       # 文档编辑器（含 AI 助手）
    │   │
    │   ├── certificates/           # 证书管理
    │   │   ├── layout.tsx
    │   │   ├── page.tsx            # 证书列表
    │   │   └── [id]/page.tsx       # 证书详情
    │   │
    │   ├── verify/
    │   │   └── [token]/page.tsx    # 公开证书验证页（无需登录）
    │   │
    │   ├── logs/
    │   │   └── [id]/page.tsx       # 打字事件日志查看
    │   │
    │   ├── review/                 # 同行评审（Reviewer 视图）
    │   │   ├── page.tsx
    │   │   ├── dashboard/page.tsx
    │   │   └── [paperId]/page.tsx  # PDF + 评审编辑器
    │   │
    │   ├── admin/papers/           # 管理员论文管理
    │   │   ├── page.tsx
    │   │   ├── upload/page.tsx
    │   │   └── [paperId]/reviewers/page.tsx
    │   │
    │   └── terms/page.tsx          # 服务条款
    │
    ├── components/
    │   ├── navigation/
    │   │   └── navbar.tsx          # 顶部导航栏（登录状态感知）
    │   │
    │   ├── documents/
    │   │   ├── document-card.tsx
    │   │   └── document-card-skeleton.tsx
    │   │
    │   ├── certificates/
    │   │   ├── certificate-generation-dialog.tsx
    │   │   ├── access-code-dialog.tsx
    │   │   ├── access-code-management-dialog.tsx
    │   │   ├── document-viewer.tsx   # 证书内文档内容展示
    │   │   ├── document-replay.tsx   # 打字过程回放
    │   │   └── certificate-card-skeleton.tsx
    │   │
    │   ├── ai/
    │   │   ├── ai-assistant-button.tsx
    │   │   ├── ai-assistant-panel.tsx  # AI 侧边面板（流式输出）
    │   │   ├── ai-settings-dialog.tsx  # 用户配置 AI Provider/Key
    │   │   ├── ai-selection-menu.tsx   # 选中文字时弹出 AI 菜单
    │   │   └── ai-logs-list.tsx
    │   │
    │   ├── review/
    │   │   ├── ReviewWorkspace.tsx     # 评审工作区（PDF + 编辑器）
    │   │   ├── ReviewEditor.tsx        # 评审意见编辑器
    │   │   ├── PDFViewer.tsx
    │   │   ├── PDFViewerClient.tsx
    │   │   └── SimplePDFViewer.tsx
    │   │
    │   ├── polyfill-provider.tsx       # 客户端 polyfill 加载
    │   └── ui/                         # shadcn/ui 组件库（30+ 组件）
    │
    ├── hooks/                      # React 自定义 Hooks
    │   ├── use-auth.ts             # 登录/注册/退出
    │   ├── use-documents.ts        # 文档列表管理
    │   ├── use-document.ts         # 单文档操作
    │   ├── use-document-events.ts  # 追踪事件查询
    │   ├── use-certificates.ts     # 证书管理
    │   ├── use-ai.ts               # AI 助手交互
    │   └── use-toast.ts
    │
    ├── stores/                     # Zustand 全局状态
    │   ├── auth-store.ts           # 用户身份（token、user 信息）
    │   ├── ai-store.ts             # AI 面板状态
    │   └── pdf-text-store.ts       # PDF 文本缓存（评审用）
    │
    ├── lib/
    │   ├── api-client.ts           # Axios 实例（自动 token 刷新拦截器）
    │   ├── socket-client.ts        # Socket.IO 客户端（单例）
    │   ├── polyfills.ts            # 浏览器 polyfill
    │   ├── utils.ts                # cn() 等工具函数
    │   └── api/
    │       └── review-api.ts       # 评审相关 API 调用
    │
    └── __tests__/                  # Jest 单元测试
        ├── utils.test.ts
        ├── validation-schemas.test.ts
        ├── token-manager.test.ts
        ├── hooks/
        │   ├── use-auth.test.ts
        │   └── use-documents.test.ts
        ├── stores/
        │   └── auth-store.test.ts
        └── components/
            ├── button.test.tsx
            ├── input.test.tsx
            └── CreateDocumentDialog.test.tsx
```

---

### 3. `packages/frontend` — 管理后台（Admin Dashboard）

**技术栈**：Next.js 14 App Router / Recharts / Socket.IO Client / Zustand

**端口**：3000（开发）/ 生产未部署（规划中通过 `/admin` 路径）

```
packages/frontend/src/
├── app/
│   ├── (auth)/                     # 管理员登录/注册
│   ├── dashboard/page.tsx          # 概览（项目列表）
│   └── projects/
│       ├── new/page.tsx            # 创建追踪项目
│       ├── [id]/page.tsx           # 项目详情
│       ├── [id]/analytics/page.tsx # 打字行为分析图表
│       ├── [id]/sessions/page.tsx  # 会话列表
│       ├── [id]/live-preview/page.tsx  # 实时打字预览
│       ├── [id]/export/page.tsx    # 数据导出
│       ├── [id]/snippets/page.tsx  # 代码片段生成
│       └── [id]/settings/page.tsx  # 项目设置
│
├── components/
│   ├── SessionsTable.tsx
│   ├── navigation/navbar.tsx
│   └── live-preview/               # 实时分析面板组件
│
├── hooks/
│   ├── use-auth.ts
│   ├── use-typing-analytics.ts
│   └── use-selected-metrics.ts
│
├── lib/
│   ├── api-client.ts               # Axios（带 JWT 刷新）
│   ├── socket-client.ts            # Socket.IO（实时预览）
│   ├── analytics-utils.ts
│   └── metric-definitions.ts
│
└── stores/
    └── auth-store.ts
```

---

### 4. `packages/editor` — Lexical 富文本编辑器

**技术栈**：Lexical / React / TypeScript

被 `frontend-user` 消费。负责富文本编辑，同时捕获并发送用户的打字行为事件。

```
packages/editor/src/
├── index.ts                        # 公开导出
├── lexical-editor.tsx              # 主编辑器组件
│
├── plugins/
│   ├── tracking-plugin.tsx         # 核心：捕获 keystroke/paste/copy 事件
│   ├── toolbar-plugin.tsx          # 工具栏
│   ├── auto-save-plugin.tsx        # 自动保存
│   ├── formatting-plugin.tsx
│   ├── heading-plugin.tsx
│   ├── list-plugin.tsx
│   ├── alignment-plugin.tsx
│   └── selection-popup-plugin.tsx  # 选中文字弹出菜单
│
├── components/
│   ├── color-picker.tsx
│   └── toolbar/                    # 工具栏子组件
│
├── tracking/
│   └── editor-tracker.ts           # 事件聚合与上报逻辑
│
├── commands/
│   └── formatting-commands.ts
│
├── constants/
│   ├── colors.ts
│   ├── fonts.ts
│   └── font-sizes.ts
│
└── utils/
    ├── color-utils.ts
    └── text-formatting.ts
```

---

### 5. `packages/tracker` — 嵌入式追踪库

**技术栈**：TypeScript / Rollup / Terser

打包为单个 `<15KB` 的 JS 文件，由后端在 `/tracker/` 路径下静态托管。

第三方（Qualtrics、Google Forms 等）嵌入此脚本来追踪用户输入行为。

```
packages/tracker/
├── package.json
├── rollup.config.js                # Rollup + Terser 打包配置
├── tsconfig.json
├── example.html                    # 本地测试页面
│
└── src/
    ├── index.ts                    # 公开 API：HumanlyTracker 类
    ├── tracker.ts                  # 主追踪逻辑（监听 DOM 输入事件）
    ├── api-client.ts               # 与后端通信（init/events/submit）
    ├── event-buffer.ts             # 事件缓冲区（批量上报）
    ├── dom-utils.ts                # DOM 辅助工具
    └── types.ts                    # 类型定义
```

**API 端点**：
- `POST /api/v1/track/init` — 初始化追踪 session
- `POST /api/v1/track/events` — 批量上报事件
- `POST /api/v1/track/submit` — 提交完成（表单提交时）

---

### 6. `packages/shared` — 共享类型库

**技术栈**：TypeScript / Zod

被后端和两个前端共同引用，必须在其他包之前构建。

```
packages/shared/src/
├── index.ts                        # 统一导出
├── config/
│   └── brand.ts                    # 品牌配置（应用名、域名等）
│
├── types/
│   ├── index.ts
│   ├── api.types.ts                # API 请求/响应类型
│   ├── user.types.ts
│   ├── document.types.ts
│   ├── event.types.ts              # 追踪事件类型
│   ├── session.types.ts
│   ├── project.types.ts
│   ├── ai.types.ts
│   └── review.types.ts
│
└── utils/
    ├── constants.ts                # 全局常量
    └── validators.ts               # Zod 验证 schema
```

---

## 数据库结构

**数据库**：PostgreSQL 15 + TimescaleDB 扩展

| 表名 | 说明 |
|------|------|
| `users` | 用户账户（email、密码哈希、角色） |
| `refresh_tokens` | JWT 刷新令牌 |
| `projects` | 追踪项目（开发者创建） |
| `sessions` | 单次追踪会话（一次表单填写） |
| `events` | **TimescaleDB 超表**，存储所有键盘/粘贴/复制事件，按天分区 |
| `documents` | 用户文档（在 editor 中创建） |
| `document_events` | 文档级别的追踪事件 |
| `certificates` | 真实性证书（含验证 token） |
| `ai_conversations` | AI 助手对话历史 |
| `ai_selection_actions` | AI 选中文字操作记录 |
| `user_ai_settings` | 用户 AI 配置（Provider、加密 API Key） |
| `papers` | 上传的 PDF 论文（同行评审用） |
| `paper_reviewers` | 论文-评审人关联 |
| `reviews` | 评审记录 |
| `review_comments` | 评审意见 |

---

## 生产部署架构

```
Internet
    │
    ▼
nginx:80/443 (humanly-nginx)
    │
    ├── /api/*         ──▶  backend:3001 (humanly-backend)
    ├── /socket.io/*   ──▶  backend:3001 (WebSocket)
    ├── /tracker/*     ──▶  backend:3001 (静态 JS)
    ├── /health        ──▶  backend:3001
    └── /*             ──▶  frontend-user:3002 (humanly-frontend-user)
                               │
                       postgres:5432 (humanly-db, TimescaleDB)
                       redis:6379    (humanly-redis)
```

**网络隔离**：所有服务在同一 Docker bridge 网络 `humanly-network` 中，只有 nginx 绑定主机端口 80/443。

**SSL**：Let's Encrypt 证书（certbot webroot 方式），nginx 处理 TLS 终止。

---

## 关键环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串（生产指向 `postgres` 容器） |
| `REDIS_URL` | Redis 连接串（生产指向 `redis` 容器） |
| `JWT_SECRET` | JWT 签名密钥（32+ 字节随机值） |
| `AI_ENCRYPTION_KEY` | 用户 AI Key 加密密钥 |
| `CORS_ORIGIN` | 允许的前端来源（生产：`https://app.writehumanly.net`） |
| `FRONTEND_USER_URL` | 用户门户 URL（用于证书验证链接生成） |
| `NEXT_PUBLIC_API_URL` | 前端调用 API 的基础 URL（构建时烘焙进 JS bundle） |
| `NEXT_PUBLIC_WS_URL` | WebSocket 连接 URL（构建时烘焙） |
| `EMAIL_SERVICE` | 邮件服务（`console` / `sendgrid`） |

---

## 构建顺序

生产构建必须严格按依赖顺序：

```
shared → tracker → backend
shared → editor  → frontend-user
```

Docker 镜像构建时已在 Dockerfile 中强制该顺序。

---

## 测试

```bash
# 运行所有测试
npm test

# 只测试后端
npm test --workspace=@humory/backend

# 只测试用户门户（74 个单元测试）
npm test --workspace=@humory/frontend-user

# 单个测试文件
cd packages/frontend-user && npx jest src/__tests__/utils.test.ts
```

测试框架：Jest + React Testing Library（frontend-user）
