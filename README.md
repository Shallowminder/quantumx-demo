# QuantumX Demo

QuantumX 是一个 AI Native 的个人思考沉淀工具 Demo。它面向学生、写作者、研究者和长期自我成长的人，强调低摩擦记录、相关旧记录召回、主题沉淀、基于历史记录的蒸馏输出和轻量个人洞察。

## 体验重点

- 快速记录：像写备忘录一样输入一句想法。
- 今日思考：看到最近记录、待整理内容和系统重新带回的旧想法。
- 相关旧想法：输入时自动带出过去相近的记录，并解释召回原因。
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

## Deployment

QuantumX 是纯前端本地优先 Demo，没有后端、数据库、账号系统、真实 LLM API 或云同步。当前数据保存在当前浏览器的 `localStorage` 中：

- 换设备不会自动同步。
- 清理浏览器数据会丢失本地记录。
- 暂时没有账号、云同步和服务端备份。

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
