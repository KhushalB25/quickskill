/**
 * Bulk question generator — fills every focus area to 10 questions.
 *
 * Reads the current seed/seedSkills.js, identifies understocked focus areas
 * (< 10 questions), generates missing questions via AI, and writes the
 * expanded skills array to seed/seedSkills-expanded.js.
 *
 * Usage: node seed/bulkGenerate.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env ────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    console.warn('No .env file found — AI generation will fail without API key.');
    return;
  }
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key] && !process.env[key.replace('VITE_', '')]) {
      process.env[key] = value;
      // Also set without VITE_ prefix for server-side access
      process.env[key.replace('VITE_', '')] = value;
    }
  }
}

loadEnv();

// ─── Config ──────────────────────────────────────────────────────
const AI_ENDPOINT = process.env.AI_ENDPOINT ||
  process.env.VITE_AI_ENDPOINT ||
  'https://integrate.api.nvidia.com/v1/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY || process.env.VITE_AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || process.env.VITE_AI_MODEL || 'minimaxai/minimax-m2.7';
const TARGET_PER_TOPIC = 10;
const BATCH_SIZE = 10; // questions per API call
const DELAY_MS = 2000; // delay between API calls to respect rate limits

if (!AI_API_KEY) {
  console.error('Error: AI_API_KEY or VITE_AI_API_KEY must be set in .env');
  process.exit(1);
}

// ─── System prompt (same as api/generate.mjs) ─────────────────────
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
- Make questions practical and interesting, not trivial. Include some puzzle-type and hover-reveal questions for variety.

Example of correct output format:
[{"questionText":"What is 2+2?","options":["3","4","5","6"],"correctAnswer":"4","explanation":"2+2 equals 4.","topic":"math","interactionType":"multiple-choice"}]`;

// ─── Parse seed file ──────────────────────────────────────────────
function extractSkillsArray() {
  const seedPath = resolve(__dirname, 'seedSkills.js');
  const content = readFileSync(seedPath, 'utf-8');

  // Find the skills array
  const startMarker = 'const skills = [';
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) throw new Error('Could not find skills array in seedSkills.js');

  // Find the matching closing bracket
  let depth = 0;
  let endIdx = startIdx + startMarker.length;
  for (let i = startIdx + startMarker.length - 1; i < content.length; i++) {
    if (content[i] === '[') depth++;
    else if (content[i] === ']') {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  const skillsJson = content.slice(startIdx + 'const skills = '.length, endIdx);
  const skills = new Function(`return ${skillsJson}`)();
  return { skills, preContent: content.slice(0, startIdx), postContent: content.slice(endIdx) };
}

// ─── Count questions per focus area ───────────────────────────────
function getTopicCounts(questionBank) {
  const counts = {};
  questionBank.forEach((q) => {
    const t = q.topic || 'general';
    counts[t] = (counts[t] || 0) + 1;
  });
  return counts;
}

// ─── AI API call ─────────────────────────────────────────────────
function extractJson(text) {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : text;

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    throw new Error('Could not parse AI response as JSON.');
  }
}

function normalizeQuestions(questions, expectedCount) {
  if (!Array.isArray(questions)) {
    throw new Error('AI response is not an array.');
  }

  return questions
    .filter((q) => {
      const text = q.questionText || q.question || q.question_text || q.text || '';
      const answer = q.correctAnswer || q.correct_answer || q.correct || q.answer || '';
      return text && answer;
    })
    .slice(0, expectedCount)
    .map((q) => ({
      questionText: q.questionText || q.question || q.question_text || q.text || '',
      options: (q.interactionType || q.type) === 'text-input' ? undefined : (q.options || q.choices || q.answers || []),
      correctAnswer: q.correctAnswer || q.correct_answer || q.correct || q.answer || '',
      explanation: q.explanation || q.explanation_text || q.hint || '',
      topic: q.topic || q.category || q.subject || 'general',
      interactionType: q.interactionType || q.type || 'multiple-choice',
    }));
}

async function generateQuestions(skillName, focusTopic, count, existingQuestions) {
  const excludeTexts = existingQuestions
    .map((q) => q.questionText)
    .filter(Boolean);

  const excludePrompt = excludeTexts.length > 0
    ? `STRICTLY AVOID generating questions similar to these existing ones:\n${excludeTexts.slice(0, 20).map((t) => `- ${t}`).join('\n')}`
    : '';

  const userPrompt = `Generate ${count} unique multiple-choice questions for the skill "${skillName}" focusing on the specific topic "${focusTopic}".

${excludePrompt}

Each question must:
- Be specifically about the "${focusTopic}" focus area
- Have exactly 4 options
- Include a detailed explanation of the correct answer
- Be practical and interesting, not textbook-trivial
- Use the topic field value "${focusTopic}"
- Include a mix of easy and challenging questions`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
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

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error('Empty AI response');

      const json = extractJson(content);
      const questions = normalizeQuestions(json, count);

      if (questions.length === 0) throw new Error('No valid questions returned');

      // Ensure all generated questions have the correct topic
      questions.forEach((q) => { q.topic = focusTopic; });

      return questions;
    } catch (err) {
      if (attempt === 1) throw err;
      console.warn(`    Retry after error: ${err.message}`);
      await sleep(3000);
    }
  }
  return [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Serialize skills array back to JS ────────────────────────────
function serializeSkills(skills) {
  const lines = [];
  lines.push('const skills = [');
  skills.forEach((skill, si) => {
    lines.push('  // ' + '─'.repeat(60));
    lines.push(`  // ─── ${si + 1}. ${skill.name} ─${'─'.repeat(Math.max(0, 55 - skill.name.length))}`);
    lines.push('');
    lines.push('  {');
    lines.push(`    name: ${JSON.stringify(skill.name)},`);
    lines.push(`    description: ${JSON.stringify(skill.description)},`);
    lines.push(`    enhances: ${JSON.stringify(skill.enhances)},`);
    lines.push(`    example: ${JSON.stringify(skill.example)},`);
    lines.push(`    type: ${JSON.stringify(skill.type)},`);
    lines.push(`    difficulty: ${JSON.stringify(skill.difficulty)},`);
    lines.push(`    topic: ${JSON.stringify(skill.topic)},`);
    lines.push('    questionBank: [');
    skill.questionBank.forEach((q, qi) => {
      if (qi > 0 && q.topic !== skill.questionBank[qi - 1].topic) {
        lines.push(''); // Blank line between topics
      }
      const opts = q.options
        ? `[${q.options.map((o) => JSON.stringify(o)).join(', ')}]`
        : undefined;
      lines.push('      {');
      lines.push(`        questionText: ${JSON.stringify(q.questionText)},`);
      if (opts) lines.push(`        options: ${opts},`);
      lines.push(`        correctAnswer: ${JSON.stringify(q.correctAnswer)},`);
      if (q.puzzleType) lines.push(`        puzzleType: ${JSON.stringify(q.puzzleType)},`);
      if (q.items) lines.push(`        items: ${JSON.stringify(q.items)},`);
      if (q.clues) {
        lines.push('        clues: [');
        q.clues.forEach((c) => {
          lines.push(`          { label: ${JSON.stringify(c.label)}, content: ${JSON.stringify(c.content)} },`);
        });
        lines.push('        ],');
      }
      lines.push(`        topic: ${JSON.stringify(q.topic)},`);
      lines.push(`        explanation: ${JSON.stringify(q.explanation)},`);
      lines.push(`        interactionType: ${JSON.stringify(q.interactionType)},`);
      lines.push('      },');
    });
    lines.push('    ],');
    lines.push('  },');
    lines.push('');
  });
  lines.push('];');
  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('QuickSkill Bulk Question Generator');
  console.log(`Model: ${AI_MODEL}`);
  console.log(`Target: ${TARGET_PER_TOPIC} questions per focus area\n`);

  const { skills, preContent, postContent } = extractSkillsArray();

  let totalGenerated = 0;
  let totalFocusAreas = 0;
  let totalNeeded = 0;

  for (let si = 0; si < skills.length; si++) {
    const skill = skills[si];
    const counts = getTopicCounts(skill.questionBank);
    const topics = Object.keys(counts);
    totalFocusAreas += topics.length;

    // Find understocked topics
    const deficits = topics
      .map((t) => ({ topic: t, current: counts[t], needed: TARGET_PER_TOPIC - counts[t] }))
      .filter((d) => d.needed > 0);

    totalNeeded += deficits.reduce((s, d) => s + d.needed, 0);

    if (deficits.length === 0) {
      console.log(`[${si + 1}/${skills.length}] ${skill.name} — ${topics.length} focus areas, ALL FULL ✓`);
      continue;
    }

    console.log(`\n[${si + 1}/${skills.length}] ${skill.name} — ${topics.length} focus areas, ${deficits.length} understocked:`);

    for (const d of deficits) {
      console.log(`  ${d.topic}: ${d.current}/${TARGET_PER_TOPIC} → need ${d.needed} more`);
    }

    // Generate questions per understocked topic
    for (const d of deficits) {
      const existingInTopic = skill.questionBank.filter((q) => q.topic === d.topic);
      console.log(`\n  Generating ${d.needed} questions for "${d.topic}"...`);

      try {
        const newQuestions = await generateQuestions(
          skill.name,
          d.topic,
          Math.min(d.needed, BATCH_SIZE),
          existingInTopic
        );

        if (newQuestions.length > 0) {
          skill.questionBank.push(...newQuestions);
          totalGenerated += newQuestions.length;
          console.log(`  ✓ Generated ${newQuestions.length} questions for "${d.topic}"`);
        }

        // If we need more than BATCH_SIZE, do another call
        const remaining = d.needed - newQuestions.length;
        if (remaining > 0) {
          await sleep(DELAY_MS);
          const moreQuestions = await generateQuestions(
            skill.name,
            d.topic,
            remaining,
            [...existingInTopic, ...newQuestions]
          );
          if (moreQuestions.length > 0) {
            skill.questionBank.push(...moreQuestions);
            totalGenerated += moreQuestions.length;
            console.log(`  ✓ Generated ${moreQuestions.length} more questions for "${d.topic}"`);
          }
        }
      } catch (err) {
        console.error(`  ✗ Failed for "${d.topic}": ${err.message}`);
      }

      // Rate limiting delay between API calls
      await sleep(DELAY_MS);
    }
  }

  // ─── Write expanded output ────────────────────────────────────
  const outputPath = resolve(__dirname, 'seedSkills-expanded.js');
  const skillsContent = serializeSkills(skills);

  // Reconstruct full file — strip leading semicolon/newline from postContent
  // since serializeSkills already ends with "];"
  const cleanPost = postContent.replace(/^[\s;]+/, '\n\n');
  const ids = skills.map((s) => s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));
  const fullFile = preContent + skillsContent + cleanPost;

  writeFileSync(outputPath, fullFile, 'utf-8');

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Summary:`);
  console.log(`  Skills processed: ${skills.length}`);
  console.log(`  Total focus areas: ${totalFocusAreas}`);
  console.log(`  Total questions needed: ${totalNeeded}`);
  console.log(`  Total questions generated: ${totalGenerated}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`\nNext: Replace seed/seedSkills.js with the expanded file and re-run 'npm run seed'`);
}

main().catch((err) => {
  console.error('Bulk generation failed:', err);
  process.exit(1);
});
