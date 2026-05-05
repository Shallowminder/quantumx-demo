# QuantumX

QuantumX 是一个 AI Native 的个人思考沉淀工具。它面向学生、写作者、研究者、知识工作者和长期自我成长的人，帮助用户低摩擦记录日常想法，并把旧记录、主题、草稿和个人洞察慢慢连接起来。

它不是科幻概念演示，也不是普通笔记软件。QuantumX 的第一阶段目标很朴素：

> 写下一句话，让相关旧想法回来；把零散记录整理成主题，再蒸馏成可以继续写的草稿。

线上 Demo：

[https://quantumx-demo-xi.vercel.app](https://quantumx-demo-xi.vercel.app)

## 当前阶段

QuantumX 已经从纯前端 Demo 推进到可用原型阶段：

- 本地优先：未登录也能记录、整理、搜索、蒸馏和备份。
- 账号登录：支持 Supabase Email Magic Link 登录。
- 云端同步：登录后数据按账号隔离，并同步到 Supabase。
- AI 蒸馏：通过 Supabase Edge Function 调用 OpenAI-compatible provider，当前已验证 DeepSeek 可用。
- 语义召回：已接入 `thought_embeddings`、`recall` 和 `embed-thoughts`，相关旧想法优先走云端 embedding 召回，失败时回退本地规则。
- 四套外观：支持浅色、深色、跟随系统，以及多种 Apple-like 的低饱和视觉风格。
- 移动端优化：底部导航、头像登录菜单、滚动锁定、Search 和 Distill 手机端布局已经过多轮修正。

## 核心体验

- 快速记录：像写备忘录一样输入一句想法。
- 今日思考：看到最近记录、待整理内容和系统重新带回的旧想法。
- 相关旧想法：输入或搜索时召回过去相近的记录，并解释为什么推荐。
- 找回想法：支持本地搜索 + 云端语义召回，按类型、主题、状态筛选。
- 主题沉淀：展示主题的记录数量、最早出现、最近更新、关键记录和正在形成的问题。
- 蒸馏输出：选择主题和来源记录，生成文章提纲、复盘框架或观点卡片。
- 草稿库：AI 或本地模板生成的内容可以编辑、保存、删除和复制 Markdown。
- 想法详情：查看原始内容、状态轨迹、相关旧想法，以及这条想法被哪些草稿引用。
- 我的思考：私人长期思考主页，包含长期主题、输出草稿和思考日历。
- 个人洞察：以轻量周回顾形式提示最近反复出现的主题和下一步整理动作。
- 数据与隐私：支持 JSON 备份/恢复、登录状态、云同步状态和本地/云端摘要。

## 已完成的关键能力

### 本地数据

- `localStorage` 保存 thoughts、topics、distill drafts、capture draft、外观设置等数据。
- 游客模式和不同邮箱账号使用独立本地缓存，避免同一台设备切换账号时串数据。
- 支持 JSON 备份和恢复。
- Data 页面会显示最近本地保存时间。
- JSON 恢复已经改为导入前预览：先解析文件，展示记录、主题、草稿数量，再由用户确认覆盖当前浏览器数据。
- 本地写入后会尽量通过 snapshot repository 同步到云端。

### Supabase 登录与同步

- Supabase Auth Email Magic Link 已跑通。
- 数据表包括：
  - `profiles`
  - `thoughts`
  - `topics`
  - `thought_topics`
  - `distill_drafts`
  - `memory_feedback`
  - `capture_drafts`
  - `thought_embeddings`
- RLS 已开启，用户数据按 `auth.uid()` 隔离。
- 同一账号在新设备登录后，如果本地为空且云端已有数据，会自动恢复云端内容。
- Data / Sync 面板会显示云端摘要刷新时间，并在本地和云端同时有内容时提示上传与恢复的差异。
- 云端上传文案已明确为“上传/更新到云端”：它会 upsert 同 `client_id` 的记录、主题和草稿，但不会自动删除云端多余旧数据。
- 当前同步模型是本地优先 + snapshot upsert，不是多人实时协作。

### AI 蒸馏

- Supabase Edge Function：`distill`
- 前端通过 `distillRepository` 调用服务端函数。
- 支持 OpenAI-compatible `/chat/completions` provider。
- 可配置 DeepSeek、Kimi/Moonshot、OpenAI 等模型。
- 如果云端 AI 不可用，会回退到本地模板生成，不阻塞主流程。

### 语义召回

- Supabase Edge Functions：
  - `recall`
  - `embed-thoughts`
- `recall` 会优先使用 embedding 排序相关旧想法。
- `embed-thoughts` 用于云同步后预热最近 thoughts 的 embeddings。
- 如果 embedding secrets 未配置或调用失败，会回退到 lexical / local recall。
- Search、Today、Thought Detail 的相关旧想法已经逐步接入云端 recall。
- Search、Today、Thought Detail 已统一使用 `MemoryMatchCard` 展示相关旧想法。
- 相关旧想法反馈已经写入 `memory_feedback`，包括有帮助、不相关、同一主题等轻量反馈。

### 前端体验

- Thought Detail 显示「想法状态轨迹」。
- Thought Detail 显示当前想法被哪些 Distill 草稿引用。
- Topic Detail 显示「主题成长时间线」。
- Related Memories 显示「召回解释」和反馈按钮。
- Distill 在生成前显示「来源组成」，包含选中主题、来源数量、时间跨度、状态分布和输出类型。
- Distill 支持复制 Markdown，并提供成功 / 失败反馈。
- Insights 显示最近 7 天思考痕迹。
- Personal Home 显示最近一年思考日历。
- 四套视觉风格使用语义 token 统一管理，仍在持续清理固定色。
- 移动端已重点修复头像菜单、底部导航、滚动锁定和页面拥挤问题。

## 技术栈

- React
- TypeScript
- Tailwind CSS
- Vite
- lucide-react
- Framer Motion
- Supabase Auth / PostgreSQL / Edge Functions
- localStorage

## 本地开发

```bash
npm install
npm run dev
```

默认本地地址：

```text
http://localhost:5173/
```

## 构建与检查

```bash
npm run lint
npm run build
npm run preview
```

当前 `lint` 实际执行 TypeScript build check：

```bash
tsc -b --pretty false
```

## 环境变量

复制模板：

```bash
cp .env.example .env.local
```

前端只需要 Supabase public env：

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_WECHAT_PROVIDER=custom:wechat
VITE_SUPABASE_AUTH_REDIRECT_PATH=/auth/callback
```

注意：

- `VITE_SUPABASE_ANON_KEY` 是浏览器可用的 Supabase anon key。
- 不要把 AI key、embedding key、service role key 放进 `VITE_` 环境变量。
- `.env.local` 不要提交到 Git。

## Supabase 设置

### 1. 数据库 Schema

在 Supabase SQL Editor 中运行：

```text
docs/supabase-schema.sql
```

这个 schema 会创建账号、记录、主题、草稿、召回反馈、快速记录草稿和 embedding 表，并开启 RLS。

### 2. Email 登录

在 Supabase Auth 中启用 Email provider。QuantumX 当前主线登录方式是 Email Magic Link。

需要确认 Supabase 里的 Site URL 和 Redirect URLs 包含你的线上地址，例如：

```text
https://quantumx-demo-xi.vercel.app
https://quantumx-demo-xi.vercel.app/auth/callback
```

本地调试时也可以加入：

```text
http://localhost:5173
http://localhost:5173/auth/callback
```

### 3. Edge Functions

仓库内已有函数：

```text
supabase/functions/distill
supabase/functions/recall
supabase/functions/embed-thoughts
```

部署示例：

```bash
supabase functions deploy distill
supabase functions deploy recall
supabase functions deploy embed-thoughts
```

## AI Provider Secrets

AI 蒸馏函数使用 Supabase Edge Function Secrets，不放在 Vercel。

OpenAI-compatible provider：

```bash
AI_PROVIDER=openai-compatible
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
```

DeepSeek 示例：

```bash
AI_PROVIDER=deepseek
AI_API_KEY=your_deepseek_key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
```

如果没有配置 AI secrets，Distill 页面会回退到本地模板。

## Embedding / Recall Secrets

语义召回使用 embedding secrets：

```bash
EMBEDDING_PROVIDER=openai-compatible
EMBEDDING_API_KEY=
EMBEDDING_BASE_URL=
EMBEDDING_MODEL=
```

如果没有配置 embedding secrets：

- `recall` 会回退到服务端 lexical recall。
- 前端会继续保留本地规则召回。
- 用户仍然可以使用搜索、记录和蒸馏，不会被阻塞。

## 部署

当前推荐 Vercel。

Vercel 配置：

```text
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

项目根目录包含 `vercel.json`，用于把前端路由回退到 `index.html`，避免刷新子页面 404。

Vercel 环境变量需要配置：

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_AUTH_REDIRECT_PATH=/auth/callback
```

AI 和 embedding key 不配置在 Vercel，统一放到 Supabase Edge Function Secrets。

## 数据说明

QuantumX 当前是本地优先工具：

- 未登录时，数据只保存在当前浏览器。
- 登录后，数据会按账号隔离并同步到 Supabase。
- 同一个账号在不同设备上可以通过云端恢复和同步。
- 不同邮箱账号的数据相互独立。
- 清理浏览器数据会删除该浏览器的本地缓存，但登录账号可以从云端恢复。
- 当前不是实时多人协作，也不是强一致云文档系统。

## 当前已知问题

- 云同步仍是 snapshot upsert 模式，复杂冲突合并还没有做。
- 语义召回质量取决于 embedding provider 和历史数据量，冷启动时仍会依赖本地规则。
- 四套配色仍在持续清理固定色和统一 surface token。
- 移动端已做多轮修复，但仍需要继续做真实手机回归。
- 微信登录不是当前主线，第一阶段以邮箱登录为主。

## 下一阶段路线

优先级从高到低：

1. 继续提升召回排序质量：让云端 embedding、关键词、主题和时间线索更稳定地合并排序。
2. 用反馈数据优化 recall：逐步利用 `memory_feedback` 调整推荐解释、相似度阈值和不相关过滤。
3. 强化草稿库：增加草稿筛选、来源查看和更清楚的继续编辑入口。
4. 完善账号与隐私说明：补齐账号删除、数据清除、云端数据范围和本地缓存说明。
5. 继续清理视觉系统：全站 surface token、四套配色、深浅模式和移动端一致性。
6. 做移动端真实设备回归：重点检查头像菜单、底部导航、滚动锁定、Search、Distill 和四套主题显示差异。

## 项目判断

QuantumX 现在不是最终产品，但已经不是单纯静态 Demo。它已经具备：

- 可每天使用的本地记录体验；
- 可登录的账号体系；
- 可恢复的云端数据；
- 可调用服务端 AI 的蒸馏能力；
- 可解释、可反馈的语义召回雏形；
- 逐步成型的 Apple-like 个人思考工作台 UI。

下一步重点不是继续加宏大概念，而是把「记录一条想法 -> 找回旧想法 -> 整理进主题 -> 蒸馏成草稿」这条日常路径打磨到稳定、可信、顺手。
