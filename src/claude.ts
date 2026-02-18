import OpenAI from 'openai';
import { MODEL, MAX_POST_CHARS } from './config.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const linkedinStructure = fs.readFileSync(join(root, 'linkedin_structure.md'), 'utf-8');
const toneGuidelines = fs.readFileSync(join(root, 'tone.md'), 'utf-8');

const SYSTEM_PROMPT = `${linkedinStructure}\n\n${toneGuidelines}`;

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

  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages,
    stream: true,
  });

  let result = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) {
      process.stdout.write(token);
      result += token;
    }
  }
  process.stdout.write('\n');

  if (!result) throw new Error('No response from model');
  return result.trim();
}
