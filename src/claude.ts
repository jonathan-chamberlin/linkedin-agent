import OpenAI from 'openai';
import { MODEL, MAX_POST_CHARS } from './config.js';
import fs from 'fs';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const toneGuidelines = fs.readFileSync(new URL('../../tone.md', import.meta.url), 'utf-8');

const SYSTEM_PROMPT = `You write LinkedIn posts. Return only the post text, nothing else.

Rules:
- Under ${MAX_POST_CHARS} characters
- 0-3 relevant hashtags max, placed at the end

${toneGuidelines}`;

export async function generatePost(
  context: string,
  previousDraft?: string,
  feedback?: string,
): Promise<string> {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Write a LinkedIn post. Context: ${context}` },
  ];

  if (previousDraft && feedback) {
    messages.push(
      { role: 'assistant', content: previousDraft },
      { role: 'user', content: `Revise the post. ${feedback}` },
    );
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('No response from model');
  return text.trim();
}
