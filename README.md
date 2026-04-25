# QuantumX Demo

QuantumX 是一个 AI Native 的个人思考沉淀工具 Demo。它面向学生、写作者、研究者和长期自我成长的人，强调低摩擦记录、相关旧记录召回、主题沉淀、基于历史记录的蒸馏输出和轻量个人洞察。

## 体验重点

- 快速记录：像写备忘录一样输入一句想法。
- 今日思考：看到最近记录、待整理内容和系统重新带回的旧想法。
- 相关旧想法：输入时自动带出过去相近的记录，并解释召回原因。
- 找回想法：本地搜索旧记录和草稿，按主题、状态和类型筛选。
- 主题沉淀：展示主题的最早记录、最近更新、待整理材料和正在形成的问题。
- 蒸馏输出：选择来源记录，生成可编辑提纲、复盘框架和观点卡片，并保存为草稿。
- 个人洞察：轻量回看最近关注的话题、可整理主题和下一步动作。
- 我的思考：一个私人的长期思考主页，汇总记录、主题、草稿和思考日历。

## 已加入的真实工具细节

- 本地持久化：新增想法、快速记录草稿和蒸馏草稿会保存到 `localStorage`。
- 快捷输入：`Cmd/Ctrl + K` 聚焦快速记录，`Cmd/Ctrl + Enter` 保存，`Esc` 清空草稿，保存后保持输入焦点。
- 保存撤销：误保存后可以在轻提示里撤销。
- 今日提示：Today 顶部会提示一条“今天可以继续”的线索。
- 待整理区：新记录先进入“待整理”，不强迫用户立刻分类。
- 想法整理：详情页支持编辑原文和摘要、加入主题、标记已整理、归档、继续写和生成草稿。
- 召回理由：相关旧想法分为直接相关、相似问题和不同角度，并支持有帮助、不相关、固定等反馈。
- 主题维护：支持新建主题、重命名主题、把未整理想法加入当前主题。
- 可编辑蒸馏：输出不只是展示，可以继续编辑、保存、打开草稿、删除草稿和复制 Markdown。
- 过程可视化：想法详情显示状态轨迹，主题页显示成长时间线，相关旧想法显示召回解释，蒸馏页显示来源组成，洞察页显示最近 7 天思考痕迹。
- 思考日历：在「我的思考」里展示最近一年哪些日子留下过想法，并可点击查看当天摘要。
- 数据备份：在「数据与隐私」里可以下载 JSON 备份，也可以从备份恢复本地记录。
- 数据层准备：localStorage 读写已集中到独立 helper，后续接账号、数据库和云同步时更容易替换。
- 本地搜索：新增「找回想法」页面，先用全文匹配跑通搜索体验，后续可以替换为 embedding 语义召回。
- 云同步准备：新增 Supabase schema 草案、环境变量模板和 repository 接口，本地模式仍然默认可用。

## 技术栈

- React
- TypeScript
- Tailwind CSS
- lucide-react
- Framer Motion
- Vite

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
```

## Preview

```bash
npm run preview
```

## Cloud Sync Preparation

当前线上 Demo 仍默认使用本地模式。仓库里已经准备了下一阶段接 Supabase 的基础文件：

- `docs/supabase-schema.sql`：账号、记录、主题、草稿、召回反馈和 RLS 策略草案。
- `.env.example`：未来接 Supabase 所需的环境变量模板。
- `src/services/quantumxRepository.ts`：数据仓储接口和 localStorage 实现，后续可以新增 Supabase 实现替换。
- `src/services/supabaseClient.ts`：可选 Supabase client。没有环境变量时不会启用云端能力。
- `src/services/authRepository.ts`：邮箱 magic link 登录入口。当前只准备身份会话，数据同步仍保持本地模式。
- `src/services/cloudMigration.ts`：把当前浏览器里的本地记录、主题、草稿和快速记录草稿迁移到 Supabase。

如果要开始接 Supabase，先复制环境变量模板：

```bash
cp .env.example .env.local
```

然后填入：

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

不要把 `.env.local` 提交到 Git。

配置完成后，「数据与隐私」页会显示邮箱登录入口。登录后可以点击「同步到云端」，
把当前浏览器里的 thoughts/topics/drafts/capture draft 写入 Supabase 表。

当前同步是本地到云端的单向迁移，不是完整双向实时同步。重复点击会按 `client_id`
更新同一批本地数据，不会为同一条本地记录无限创建重复行。

现在「数据与隐私」页还会显示本地/云端摘要，以及最近一次上传和恢复时间，帮助用户判断下一步该推本地还是拉云端。
同时会根据两边最近活动时间和数量差异，给出更明确的同步建议与覆盖提醒，降低误操作风险。

## Deployment

QuantumX 是纯前端本地优先 Demo，没有后端、数据库、账号系统、真实 LLM API 或云同步。当前数据保存在当前浏览器的 `localStorage` 中：

- 换设备不会自动同步。
- 清理浏览器数据会丢失本地记录。
- 暂时没有账号、云同步和服务端备份。
- 可以在「数据与隐私」页面手动下载 JSON 备份，用于迁移或恢复。

## Productization Roadmap

当前版本已经从展示型 Demo 进入本地可用原型阶段。要继续落地成可长期使用的产品，建议按这个顺序推进：

1. 账号与云数据库：根据 `docs/supabase-schema.sql` 接入 Supabase / PostgreSQL，保存用户、记录、主题、草稿和反馈。
2. 真实召回：把当前本地搜索升级为数据库全文索引 + embedding 向量检索。
3. AI 蒸馏服务：在服务端调用 LLM 生成摘要、主题建议、提纲和每周回顾。
4. 数据安全：提供导出、删除账号、备份恢复、隐私说明和错误监控。
5. 国内可访问部署：如果面向国内朋友试用，优先考虑 EdgeOne Pages 或国内静态托管 + CDN。

### Deploy To Vercel

推荐使用 Vercel 部署：

1. Push project to GitHub.
2. Open Vercel and import the GitHub repository.
3. Framework Preset 选择 `Vite`.
4. Install Command 使用 `npm install`.
5. Build Command 使用 `npm run build`.
6. Output Directory 使用 `dist`.
7. Deploy.

项目根目录已包含 `vercel.json`，用于把所有前端路由回退到 `index.html`，避免后续接入前端路由后刷新页面出现 404。

也可以使用 Vercel CLI：

```bash
npm install -g vercel
vercel
vercel --prod
```

CLI 不是必需项；第一版建议直接通过 Vercel 连接 GitHub 仓库自动部署。
