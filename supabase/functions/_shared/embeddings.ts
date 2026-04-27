export function hashText(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${hash >>> 0}`;
}

export async function embedTexts(texts: string[]) {
  const apiKey = Deno.env.get("EMBEDDING_API_KEY")?.trim();
  const baseUrl =
    Deno.env.get("EMBEDDING_BASE_URL")?.trim() ?? "https://api.openai.com/v1";
  const model = Deno.env.get("EMBEDDING_MODEL")?.trim();

  if (!apiKey || !model) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Embedding request failed: ${response.status} ${message}`);
  }

  const data = await response.json();
  const embeddings = Array.isArray(data.data)
    ? data.data.map((item: { embedding?: number[] }) => item.embedding ?? [])
    : [];

  return {
    provider: Deno.env.get("EMBEDDING_PROVIDER")?.trim() ?? "openai-compatible",
    model,
    embeddings,
  };
}
