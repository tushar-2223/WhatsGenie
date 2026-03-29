import { Groq } from 'groq-sdk';
import { DEFAULT_GROQ_MODEL } from './config';

export const GROQ_MODELS = {
  gptOss120b: 'openai/gpt-oss-120b',
} as const;

export type ModelKey = keyof typeof GROQ_MODELS;

export interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isOutgoing?: boolean;
}

export async function callGroq(apiKey: string, model: string, prompt: string): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('Missing Groq API key.');
  }

  // This runs inside the extension side panel, so browser use is intentional here.
  const groq = new Groq({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true,
  });

  const stream = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: model || DEFAULT_GROQ_MODEL,
    temperature: 1,
    max_completion_tokens: 8192,
    top_p: 1,
    stream: true,
    reasoning_effort: 'medium',
  });

  let fullResponse = '';

  for await (const chunk of stream) {
    fullResponse += chunk.choices[0]?.delta?.content || '';
  }

  return fullResponse.trim();
}

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
(3-5 sentences capturing the main discussion)

## Key Topics
(bullet list of main subjects discussed)

## Action Items
(any tasks, decisions, or follow-ups mentioned - write "None identified" if absent)

## Sentiment
(overall tone in one word: Positive / Neutral / Tense / Mixed)

## Most Active Members
(top 3 participants by message count, format: "Name - X messages")

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
