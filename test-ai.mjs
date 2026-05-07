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

  if (!apiKey) {
    console.error('No API key found in VITE_AI_API_KEY');
    console.error('Found env keys:', Object.keys(process.env).filter(k => k.includes('AI') || k.includes('KEY')));
    process.exit(1);
  }

  const userPrompt = 'Generate 2 unique questions for the skill "Pattern Recognition" (topic: logic). Make each question different from standard textbook questions. Be creative and practical.';

  console.log(`Testing AI generation...`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Model: ${model}`);
  console.log(`Key prefix: ${apiKey.substring(0, 10)}...`);

  const start = Date.now();

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

    const elapsed = Date.now() - start;

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`API ERROR (${response.status}) after ${elapsed}ms`);
      console.error(`Response: ${errorBody.substring(0, 500)}`);
      process.exit(1);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const totalTokens = data.usage?.total_tokens || '?';

    if (!content) {
      console.error(`Empty response after ${elapsed}ms`);
      process.exit(1);
    }

    console.log(`\n✓ SUCCESS in ${elapsed}ms (${totalTokens} tokens)`);
    console.log(`\nRaw response (first 200 chars):`);
    console.log(content.substring(0, 200));

    const json = JSON.parse(content);
    console.log(`\nParsed ${json.length} questions:`);
    json.forEach((q, i) => {
      console.log(`  ${i+1}. ${q.questionText} (topic: ${q.topic})`);
    });
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`ERROR after ${elapsed}ms: ${err.message}`);
  }
}

main();
