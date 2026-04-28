function safeDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDayLabel(value: string): string {
  const date = safeDate(value);
  if (!date) return "时间未知";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff =
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24);

  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (dayDiff === 0) return `今天 ${time}`;
  if (dayDiff === 1) return `昨天 ${time}`;

  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMonthDay(value: string): string {
  const date = safeDate(value);
  if (!date) return "时间未知";

  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(value: string): string {
  const date = safeDate(value);
  if (!date) return "时间未知";

  return date.toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
