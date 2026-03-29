// src/lib/gemini.ts
// All Gemini API calls and prompt templates

export const MODELS = {
  flash: 'gemini-1.5-flash',
  pro: 'gemini-1.5-pro',
} as const;

export type ModelKey = keyof typeof MODELS;

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

export interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isOutgoing?: boolean;
}

export async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `${BASE_URL}${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gemini API error');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
