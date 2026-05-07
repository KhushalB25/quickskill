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
- Make questions practical and interesting, not trivial.

Example of correct output format:
[{"questionText":"What is 2+2?","options":["3","4","5","6"],"correctAnswer":"4","explanation":"2+2 equals 4.","topic":"math","interactionType":"multiple-choice"}]`;

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
    .map((q) => {
      const questionText = q.questionText || q.question || q.question_text || q.text || '';
      const correctAnswer = q.correctAnswer || q.correct_answer || q.correct || q.answer || '';
      const options = q.options || q.choices || q.answers || [];
      const explanation = q.explanation || q.explanation_text || q.hint || '';
      const topic = q.topic || q.category || q.subject || 'general';
      const interactionType = q.interactionType || q.type || 'multiple-choice';

      return {
        questionText,
        options: interactionType === 'text-input' ? undefined : options,
        correctAnswer,
        explanation,
        topic,
        interactionType,
      };
    });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { skillName, skillTopic, count = 10, selectedTopics, topicDistribution } = req.body;
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'AI API key not configured.' });
  }

  const endpoint = process.env.AI_ENDPOINT || 'https://integrate.api.nvidia.com/v1/chat/completions';
  const model = process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct';

  const topicFilter = selectedTopics?.length > 0
    ? `Focus on these subtopics: ${selectedTopics.join(', ')}.`
    : '';

  const weakTopicPrompt = topicDistribution?.length > 0
    ? `The user needs extra practice on these topics: ${topicDistribution.map(t => `${t.topic} (${t.weight}%)`).join(', ')}. Generate more questions from these areas.`
    : '';

  const userPrompt = `Generate ${count} unique questions for the skill "${skillName}" (topic: ${skillTopic}). ${topicFilter} ${weakTopicPrompt}
Make each question different from standard textbook questions. Be creative and practical.`;

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

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

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key.');
        }
        if (response.status === 429) {
          throw new Error('Rate limited.');
        }
        throw new Error(`API error (${response.status}): ${errorBody || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from API.');
      }

      const json = extractJson(content);
      const questions = normalizeQuestions(json, count);

      if (questions.length === 0) {
        throw new Error('AI returned no valid questions.');
      }

      return res.status(200).json({ questions });
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        throw new Error('AI request timed out.');
      }
      if (err.message.includes('API key') || err.message.includes('Rate limited')) {
        throw err;
      }
    }
  }

  return res.status(500).json({ error: lastError?.message || 'Failed to generate questions.' });
}
