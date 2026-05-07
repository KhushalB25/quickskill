import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Manual .env loader (handles BOM)
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8').replace(/^﻿/, '');
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#')) {
    process.env[key.trim()] = vals.join('=').trim();
  }
});

const SYSTEM_PROMPT = `You are a question generator for a cognitive skill training app called QuickSkill. Generate unique, diverse questions.

Rules:
- Return ONLY a valid JSON array of question objects. No markdown, no explanations outside JSON.
- Each question must be unique — do NOT repeat common or well-known questions.
- Vary question types: mostly multiple-choice (4 options), some text-input.
- Use EXACTLY these field names — no variations:
  {
    "questionText": "string",
    "options": ["a", "b", "c", "d"],
    "correctAnswer": "string",
    "explanation": "string",
    "topic": "string",
    "interactionType": "multiple-choice"
  }
- "correctAnswer" must match one option exactly for multiple-choice.
- "options" must have exactly 4 strings for multiple-choice.
- For text-input questions set "interactionType": "text-input" and omit "options".
- Make questions practical and interesting, not trivial.`;

async function main() {
  const endpoint = process.env.VITE_AI_ENDPOINT || 'https://integrate.api.nvidia.com/v1/chat/completions';
  const apiKey = process.env.VITE_AI_API_KEY;
  const model = process.env.VITE_AI_MODEL || 'meta/llama-3.1-8b-instruct';

  const userPrompt = 'Generate 10 unique questions for the skill "Pattern Recognition" (topic: logic). Make each question different from standard textbook questions. Be creative and practical.';

  console.log(`Testing AI: 10 questions for "Pattern Recognition"`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Model: ${model}`);
  console.log('');

  // Test without timeout first
  console.log('1. Testing without AbortController timeout...');
  const start1 = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 4096,
      }),
    });
    const elapsed1 = Date.now() - start1;
    console.log(`  Response received in ${elapsed1}ms (status ${response.status})`);
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log(`  Content length: ${content.length} chars`);
      const json = JSON.parse(content);
      console.log(`  Parsed ${json.length} questions`);
    } else {
      const errBody = await response.text().catch(() => '');
      console.log(`  Error: ${errBody.substring(0, 200)}`);
    }
  } catch (err) {
    const elapsed1 = Date.now() - start1;
    console.log(`  FAILED after ${elapsed1}ms: ${err.message}`);
  }

  console.log('');
  console.log('2. Testing with 30s AbortController...');
  const start2 = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const elapsed2 = Date.now() - start2;
    console.log(`  Response received in ${elapsed2}ms (status ${response.status})`);
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const json = JSON.parse(content);
      console.log(`  ${json.length} questions generated successfully`);
      json.slice(0, 3).forEach((q, i) => console.log(`  ${i+1}. ${q.questionText.substring(0, 60)}`));
    }
  } catch (err) {
    const elapsed2 = Date.now() - start2;
    console.log(`  FAILED after ${elapsed2}ms: ${err.message}`);
  }
}

main();
