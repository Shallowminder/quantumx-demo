import { useState } from "react";
import { recordMemoryFeedback } from "../services/memoryFeedbackRepository";
import type { MemoryFeedbackType } from "../types";

interface PersistFeedbackParams {
  feedbackType: MemoryFeedbackType;
  sourceThoughtId?: string;
  context?: string;
}

export function useMemoryFeedback() {
  const [feedback, setFeedback] = useState<Record<string, MemoryFeedbackType>>({});

  async function persistFeedback(
    thoughtId: string,
    params: PersistFeedbackParams,
  ) {
    setFeedback((current) => ({
      ...current,
      [thoughtId]: params.feedbackType,
    }));

    await recordMemoryFeedback({
      feedbackType: params.feedbackType,
      sourceThoughtId: params.sourceThoughtId,
      targetThoughtId: thoughtId,
      context: params.context,
    }).catch(() => {
      // Keep feedback lightweight when cloud writes fail.
    });
  }

  return { feedback, persistFeedback };
}
