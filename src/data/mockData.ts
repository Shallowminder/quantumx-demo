import type { ContinueQuestion, InsightMetric, Thought, Topic } from "../types";

export const topics: Topic[] = [
  {
    id: "ai-tools",
    name: "AI 工具使用",
    summary: "你一直在关注如何把 AI 从尝鲜变成稳定的工作流。",
    description:
      "记录里反复出现的是：少一点炫技，多一点可复用的模板、检查清单和真实产出。",
    updatedAt: "2026-04-24T08:30:00+08:00",
    accent: "sage",
    thoughtIds: ["t1", "t3", "t8", "t11"],
    signals: ["工作流", "模板", "低摩擦记录"],
    distill: {
      title: "把 AI 工具纳入日常工作流",
      format: "文章提纲",
      basedOn: "基于 3 条历史记录和 2 个反复出现的问题",
      outline: [
        {
          heading: "一、工具真正有用的时候",
          bullets: [
            "不是替代思考，而是减少启动成本",
            "适合用在整理、召回、初稿和复盘阶段",
          ],
        },
        {
          heading: "二、从一次性提问到长期素材库",
          bullets: [
            "保留上下文比单次回答更重要",
            "把好问题、好提示和产出沉淀为可复用流程",
          ],
        },
        {
          heading: "三、下一步可以实践的工作流",
          bullets: [
            "每日 Capture，不急着分类",
            "每周按主题蒸馏一次，输出提纲或行动清单",
          ],
        },
      ],
      cards: [
        "AI 的价值不在于一次回答多聪明，而在于它能不能把过去的思考重新带回现场。",
        "低摩擦记录是前提，主题沉淀是长期复利。",
      ],
    },
  },
  {
    id: "writing-method",
    name: "写作方法",
    summary: "你在尝试把零散感受整理成能反复使用的写作结构。",
    description:
      "相关记录集中在素材收集、开头设计、提纲生成和观点卡片这些具体动作上。",
    updatedAt: "2026-04-23T21:10:00+08:00",
    accent: "clay",
    thoughtIds: ["t2", "t5", "t7"],
    signals: ["文章提纲", "素材卡片", "表达结构"],
    distill: {
      title: "从素材到文章的四步整理法",
      format: "写作框架",
      basedOn: "基于 3 条写作记录生成",
      outline: [
        {
          heading: "一、先记录原始感受",
          bullets: [
            "保留当时的语气，不急着改成正式表达",
            "每条素材只承载一个清楚的观察",
          ],
        },
        {
          heading: "二、再寻找重复出现的问题",
          bullets: ["把相似素材合到同一主题", "用问题而不是标签组织材料"],
        },
        {
          heading: "三、最后生成可写的提纲",
          bullets: ["先列论点和例子，再补开头结尾", "保留一两句原始记录做文章的真实感"],
        },
      ],
      cards: [
        "写作不是从空白页开始，而是从旧记录里找到还没写完的东西。",
        "好的提纲应该能看见素材来源，而不是像通用模板。",
      ],
    },
  },
  {
    id: "exam-review",
    name: "学习复盘",
    summary: "你最近更在意学习节奏，而不是单纯追求学习时长。",
    description:
      "记录里出现了考研、错题、注意力和复盘节奏，适合整理成一套周复盘模板。",
    updatedAt: "2026-04-22T19:45:00+08:00",
    accent: "blue",
    thoughtIds: ["t4", "t9"],
    signals: ["考研", "错题", "周复盘"],
    distill: {
      title: "一份更轻的学习周复盘",
      format: "复盘框架",
      basedOn: "基于 2 条学习记录生成",
      outline: [
        {
          heading: "一、本周真正推进了什么",
          bullets: ["列出 3 个完成项", "区分做了很多和真正理解"],
        },
        {
          heading: "二、哪些卡点重复出现",
          bullets: ["记录错题背后的概念漏洞", "记录注意力下滑的具体时段"],
        },
        {
          heading: "三、下周只调整一个变量",
          bullets: ["减少计划数量", "提前安排最难任务的时间段"],
        },
      ],
      cards: [
        "复盘的重点不是责备自己，而是发现下周可以少绕的一段路。",
        "错题如果只被订正一次，很快会再次变成陌生问题。",
      ],
    },
  },
  {
    id: "personal-growth",
    name: "个人成长",
    summary: "你在追踪长期习惯、情绪波动和自我要求之间的关系。",
    description:
      "这些记录更适合安静回看，不需要立刻产出，但可以帮助发现长期关注的问题。",
    updatedAt: "2026-04-21T23:20:00+08:00",
    accent: "amber",
    thoughtIds: ["t6", "t10"],
    signals: ["习惯", "能量", "长期关注"],
    distill: {
      title: "给自己的月度回看",
      format: "个人复盘",
      basedOn: "基于 2 条长期记录生成",
      outline: [
        {
          heading: "一、最近反复出现的状态",
          bullets: ["什么时候更容易进入心流", "什么时候会被琐事拖走"],
        },
        {
          heading: "二、值得保留的习惯",
          bullets: ["低门槛记录", "晚上 10 分钟轻量整理"],
        },
        {
          heading: "三、下个月继续观察的问题",
          bullets: ["哪些事情真正带来恢复感", "哪些目标只是看起来重要"],
        },
      ],
      cards: [
        "长期记录的意义，是让你看到自己不是突然变成现在这样。",
        "有些问题不需要马上解决，但值得被持续看见。",
      ],
    },
  },
];

export const thoughts: Thought[] = [
  {
    id: "t1",
    content:
      "AI 工具最有价值的地方可能不是回答问题，而是帮我把过去零散的记录重新找出来，让我不用每次都从空白开始。",
    createdAt: "2026-04-24T08:30:00+08:00",
    source: "晨间记录",
    summary: "AI 的价值在于召回个人上下文，而不是单次回答。",
    topicIds: ["ai-tools"],
    relatedIds: ["t3", "t8", "t2"],
    questions: [
      "哪些记录最值得被召回到写作现场？",
      "如何判断 AI 推荐的旧记录是真的相关？",
    ],
    status: "themed",
  },
  {
    id: "t2",
    content:
      "写文章的时候最难的不是没有素材，而是素材散在不同地方。也许应该先把想法按问题聚起来，再决定文章结构。",
    createdAt: "2026-04-24T00:12:00+08:00",
    source: "睡前想法",
    summary: "写作素材应该围绕问题聚合，再形成结构。",
    topicIds: ["writing-method"],
    relatedIds: ["t5", "t7", "t1"],
    questions: ["一个主题什么时候已经足够写成文章？", "素材聚合后应先生成提纲还是观点卡片？"],
    status: "inbox",
  },
  {
    id: "t3",
    content:
      "不要把 AI 工作流做得太重。最好是一句话丢进去，系统自动帮我关联、补上下文、给出下一步整理建议。",
    createdAt: "2026-04-23T22:45:00+08:00",
    source: "产品草稿",
    summary: "AI 工作流要轻，先记录，再自动关联和整理。",
    topicIds: ["ai-tools"],
    relatedIds: ["t1", "t8"],
    questions: ["低摩擦输入之后，系统应该主动做哪些事？"],
    status: "distilled",
  },
  {
    id: "t4",
    content:
      "今天复盘考研英语，发现错题不是词汇量的问题，而是长难句切分太慢。下周应该固定练 20 分钟句子拆解。",
    createdAt: "2026-04-23T20:20:00+08:00",
    source: "学习复盘",
    summary: "英语错题的主要卡点是长难句切分速度。",
    topicIds: ["exam-review"],
    relatedIds: ["t9"],
    questions: ["长难句练习要如何记录进步？", "是否需要单独建立错题主题？"],
    status: "themed",
  },
  {
    id: "t5",
    content:
      "一个好开头应该不是漂亮话，而是直接把读者带到一个具体困境里。先写真实场景，再给观点。",
    createdAt: "2026-04-23T17:05:00+08:00",
    source: "阅读感受",
    summary: "文章开头可以从具体困境进入，再提出观点。",
    topicIds: ["writing-method"],
    relatedIds: ["t2", "t7"],
    questions: ["哪些旧记录可以作为真实场景？"],
    status: "inbox",
  },
  {
    id: "t6",
    content:
      "最近晚上记录 10 分钟比白天硬挤时间更有效，可能因为结束一天之后更容易看清自己真正关心什么。",
    createdAt: "2026-04-22T23:12:00+08:00",
    source: "习惯记录",
    summary: "晚上短记录更容易沉淀当天真正关心的问题。",
    topicIds: ["personal-growth"],
    relatedIds: ["t10"],
    questions: ["能不能把晚上记录固定成一个很轻的回顾仪式？"],
    status: "themed",
  },
  {
    id: "t7",
    content:
      "观点卡片要短，但要有来源。最好能看到这句话来自哪几条原始记录，否则会变成普通金句。",
    createdAt: "2026-04-22T16:40:00+08:00",
    source: "写作素材",
    summary: "观点卡片需要保留原始记录来源，避免变成空泛句子。",
    topicIds: ["writing-method"],
    relatedIds: ["t2", "t5"],
    questions: ["观点卡片需要展示多少来源才不打断阅读？"],
    status: "distilled",
  },
  {
    id: "t8",
    content:
      "AI 产品如果一上来就让用户配置知识库、标签和复杂模板，会很容易失去日常使用的冲动。",
    createdAt: "2026-04-21T18:30:00+08:00",
    source: "产品观察",
    summary: "复杂配置会损害 AI 工具的日常使用意愿。",
    topicIds: ["ai-tools"],
    relatedIds: ["t1", "t3"],
    questions: ["哪些设置应该延后到用户真的需要时再出现？"],
    status: "linked",
  },
  {
    id: "t9",
    content:
      "复盘学习的时候不要只写今天学了多久，要写哪里卡住、为什么卡住、下次遇到同类题怎么处理。",
    createdAt: "2026-04-20T21:35:00+08:00",
    source: "学习复盘",
    summary: "学习复盘应记录卡点原因和下次策略。",
    topicIds: ["exam-review"],
    relatedIds: ["t4"],
    questions: ["复盘模板里是否应该固定一个“下次策略”字段？"],
    status: "themed",
  },
  {
    id: "t10",
    content:
      "我总是低估碎片记录的价值。很多长期主题其实不是规划出来的，是那些重复出现的小想法慢慢长出来的。",
    createdAt: "2026-04-19T22:18:00+08:00",
    source: "周末回看",
    summary: "长期主题来自重复出现的碎片记录。",
    topicIds: ["personal-growth"],
    relatedIds: ["t6", "t1"],
    questions: ["什么时候应该把一个重复想法升级成主题？"],
    status: "themed",
  },
  {
    id: "t11",
    content:
      "我不喜欢工具替我做太多判断。自动整理可以有，但最好让我看见依据，也能轻松改回来。",
    createdAt: "2026-04-18T19:22:00+08:00",
    source: "产品反思",
    summary: "自动整理需要给出依据，并保留用户改回来的空间。",
    topicIds: ["ai-tools"],
    relatedIds: ["t1", "t3", "t8"],
    questions: ["哪些自动判断必须解释原因？", "用户什么时候需要手动调整主题？"],
    status: "linked",
  },
];

export const insightMetrics: InsightMetric[] = [
  {
    label: "近 7 天记录",
    value: "18",
    caption: "比上周多 5 条，晚上记录更稳定",
  },
  {
    label: "持续主题",
    value: "4",
    caption: "AI 工具使用和写作方法最活跃",
  },
  {
    label: "待整理内容",
    value: "7",
    caption: "适合生成 2 份提纲和 1 份学习复盘",
  },
];

export const continueQuestions: ContinueQuestion[] = [
  {
    id: "q1",
    topicId: "ai-tools",
    question: "哪些 AI 工作流真的减少了你的启动成本？",
    note: "这个问题已经在 3 条记录里出现，可以整理成一篇短文。",
  },
  {
    id: "q2",
    topicId: "writing-method",
    question: "素材聚合后，什么情况下应该进入正式写作？",
    note: "你的写作记录里多次提到“从素材到提纲”的临界点。",
  },
  {
    id: "q3",
    topicId: "exam-review",
    question: "错题复盘要记录到什么程度才不会变重？",
    note: "适合沉淀成一个更轻的学习复盘模板。",
  },
];
