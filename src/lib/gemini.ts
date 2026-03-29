// src/lib/gemini.ts
// Replaced with OpenRouter API to avoid Gemini quota limits

export const MODELS = {
  qwenFree: 'qwen/qwen3-next-80b-a3b-instruct:free',
  llama3: 'meta-llama/llama-3-8b-instruct:free',
} as const;

export type ModelKey = keyof typeof MODELS;

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isOutgoing?: boolean;
}

export async function callOpenRouter(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/tushar-2223/WhatsGenie",
      "X-OpenRouter-Title": "WhatsGenie",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }]
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'OpenRouter API error');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── PROMPTS ──────────────────────────────────────────────────

export function buildSummarizePrompt(
  messages: ChatMessage[],
  language = 'English',
  chatName = ''
): string {
  const chatText = messages
    .map((m) => `[${m.time}] ${m.sender}: ${m.text}`)
    .join('\n');

  return `You are an expert WhatsApp chat analyst. Analyze the following ${chatName ? `"${chatName}"` : ''} chat and respond in ${language}.

Provide your response in this exact structure:

## Summary
(3–5 sentences capturing the main discussion)

## Key Topics
(bullet list of main subjects discussed)

## Action Items
(any tasks, decisions, or follow-ups mentioned — write "None identified" if absent)

## Sentiment
(overall tone in one word: Positive / Neutral / Tense / Mixed)

## Most Active Members
(top 3 participants by message count, format: "Name — X messages")

---
CHAT MESSAGES:
${chatText}`;
}

export function buildQAPrompt(messages: ChatMessage[], question: string): string {
  const chatText = messages
    .map((m) => `[${m.time}] ${m.sender}: ${m.text}`)
    .join('\n');

  return `Based on this WhatsApp chat conversation, answer the following question accurately and concisely.
If the answer is not found in the chat, say exactly: "This wasn't discussed in the chat."

QUESTION: ${question}

CHAT:
${chatText}`;
}

export function buildCustomPrompt(messages: ChatMessage[], promptBody: string): string {
  const chatText = messages
    .map((m) => `[${m.time}] ${m.sender}: ${m.text}`)
    .join('\n');

  return `${promptBody}

CHAT:
${chatText}`;
}
