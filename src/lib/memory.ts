import type { MemoryMatch, MemoryMatchKind, Thought, Topic } from "../types";

const topicKeywords: Record<string, string[]> = {
  "ai-tools": ["ai", "工具", "工作流", "提示", "知识库", "自动", "关联", "召回"],
  "writing-method": ["写", "文章", "素材", "提纲", "观点", "开头", "表达", "结构"],
  "exam-review": ["学习", "考研", "复盘", "错题", "英语", "题", "练习", "下周"],
  "personal-growth": ["习惯", "长期", "自己", "状态", "晚上", "成长", "关心", "能量"],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

function matchedKeywords(input: string, thought: Thought): string[] {
  const text = normalize(input);
  const thoughtText = normalize(`${thought.content}${thought.summary}`);

  return Object.values(topicKeywords)
    .flat()
    .filter((keyword) => {
      const key = keyword.toLowerCase();
      return text.includes(key) && thoughtText.includes(key);
    });
}

export function inferTopicIds(content: string, topics: Topic[]): string[] {
  const text = normalize(content);
  const scored = topics
    .map((topic) => {
      const score = (topicKeywords[topic.id] ?? []).reduce((sum, keyword) => {
        return text.includes(keyword.toLowerCase()) ? sum + 1 : sum;
      }, 0);

      return { topicId: topic.id, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored.slice(0, 2).map((item) => item.topicId) : ["personal-growth"];
}

function scoreAgainstInput(input: string, inputTopicIds: string[], thought: Thought): number {
  const topicOverlap = thought.topicIds.filter((id) => inputTopicIds.includes(id)).length;
  const keywordScore = matchedKeywords(input, thought).length;

  return topicOverlap * 4 + keywordScore;
}

function isCounterpoint(input: string, thought: Thought): boolean {
  const text = normalize(input);
  const thoughtText = normalize(thought.content);
  const inputWantsAutomation =
    text.includes("自动") || text.includes("系统") || text.includes("应该");
  const oldRecordPushesBack =
    thoughtText.includes("不喜欢") ||
    thoughtText.includes("不要") ||
    thoughtText.includes("太重") ||
    thoughtText.includes("失去");

  return inputWantsAutomation && oldRecordPushesBack;
}

function matchKind(input: string, inputTopicIds: string[], thought: Thought): MemoryMatchKind {
  if (isCounterpoint(input, thought)) return "counterpoint";
  if (matchedKeywords(input, thought).length > 0) return "direct";
  if (thought.topicIds.some((id) => inputTopicIds.includes(id))) return "similar";
  return "similar";
}

function matchReason(
  input: string,
  inputTopicIds: string[],
  thought: Thought,
  topics: Topic[],
): string {
  const keywords = matchedKeywords(input, thought);
  const overlappingTopic = topics.find(
    (topic) =>
      inputTopicIds.includes(topic.id) && thought.topicIds.includes(topic.id),
  );

  if (isCounterpoint(input, thought)) {
    return "这是一个不同角度，提醒你之前也担心过工具替你判断太多。";
  }

  if (keywords.length > 0) {
    return `同样提到「${keywords[0]}」，可以接上这条旧想法。`;
  }

  if (overlappingTopic) {
    return `和「${overlappingTopic.name}」主题里的记录接近。`;
  }

  return "和当前记录有相近的问题意识。";
}

export function findRelatedMemoryMatches(
  input: string | Thought,
  thoughts: Thought[],
  topics: Topic[],
  limit = 5,
): MemoryMatch[] {
  const inputText = typeof input === "string" ? input : input.content;
  const inputTopicIds =
    typeof input === "string" ? inferTopicIds(input, topics) : input.topicIds;
  const excludeId = typeof input === "string" ? undefined : input.id;

  if (inputText.trim().length < 2) {
    return thoughts.slice(0, limit).map((thought, index) => ({
      thought,
      kind: index === 0 ? "direct" : "similar",
      reason: "先把最近可能有用的旧记录放在这里。",
      score: limit - index,
    }));
  }

  return thoughts
    .filter((thought) => thought.id !== excludeId)
    .map((thought) => {
      const score = scoreAgainstInput(inputText, inputTopicIds, thought);
      const kind = matchKind(inputText, inputTopicIds, thought);
      const boostedScore = kind === "counterpoint" ? score + 2 : score;

      return {
        thought,
        kind,
        reason: matchReason(inputText, inputTopicIds, thought, topics),
        score: boostedScore,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findRelatedThoughts(
  input: string | Thought,
  thoughts: Thought[],
  topics: Topic[],
  limit = 4,
): Thought[] {
  return findRelatedMemoryMatches(input, thoughts, topics, limit).map(
    (match) => match.thought,
  );
}

export function createCapturedThought(
  content: string,
  thoughts: Thought[],
  topics: Topic[],
): Thought {
  const cleanContent = content.trim();
  const topicIds = inferTopicIds(cleanContent, topics);
  const relatedIds = findRelatedThoughts(cleanContent, thoughts, topics, 4).map(
    (thought) => thought.id,
  );
  const firstTopic = topics.find((topic) => topic.id === topicIds[0]);

  return {
    id: `new-${Date.now()}`,
    content: cleanContent,
    createdAt: new Date().toISOString(),
    source: "快速记录",
    summary:
      cleanContent.length > 42
        ? `${cleanContent.slice(0, 42)}...`
        : cleanContent,
    topicIds,
    relatedIds,
    questions: firstTopic
      ? [
          `这条想法和「${firstTopic.name}」里的哪些记录可以放在一起？`,
          "如果继续写下去，它更像文章、复盘还是观点卡片？",
        ]
      : ["这条想法可以继续追问什么？"],
    status: "inbox",
  };
}
