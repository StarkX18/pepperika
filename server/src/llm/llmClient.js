/**
 * OpenAI-compatible LLM client with graceful fallback when no API key is set.
 */

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function isLlmEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * @param {object} opts
 * @param {string} opts.system
 * @param {string} opts.user
 * @param {number} [opts.maxTokens]
 */
export async function chatCompletion({ system, user, maxTokens = 200 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('LLM error:', res.status, err);
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}
