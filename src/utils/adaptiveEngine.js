/**
 * Adaptive engine: tracks weak topics and computes distribution for AI generation.
 *
 * Core idea:
 * - Each wrong answer strengthens a topic's weakness score
 * - Topic distribution dictates how many AI questions per topic
 * - Mix of weak-topic focus + random variety prevents boredom
 */

export function computeWeakTopics(skillProgress) {
  const topicScores = skillProgress?.topicScores || {};
  const entries = Object.entries(topicScores);

  if (entries.length === 0) return [];

  return entries
    .map(([topic, data]) => ({
      topic,
      correct: data.correct || 0,
      wrong: data.wrong || 0,
      total: data.total || 0,
      weaknessRatio: data.total > 0 ? (data.wrong / data.total) : 0,
    }))
    .filter((t) => t.total >= 2) // Only consider topics with enough data
    .sort((a, b) => b.weaknessRatio - a.weaknessRatio);
}

/**
 * Build topic distribution for the AI prompt.
 * Weakest topics get highest weight.
 */
export function buildTopicDistribution(weakTopics, allAvailableTopics, count = 10) {
  // If no weak data, distribute evenly
  if (weakTopics.length === 0 || allAvailableTopics.length === 0) {
    return [];
  }

  // Take top 3 weakest
  const topWeak = weakTopics.slice(0, 3);
  const weakTopicNames = topWeak.map((t) => t.topic);

  // Available topics that aren't weak
  const otherTopics = allAvailableTopics.filter((t) => !weakTopicNames.includes(t));

  // Distribution: 60% weakest, 25% other weak, 15% random variety
  const distribution = [];

  const weakShare = Math.max(1, Math.floor(count * 0.6));
  const midShare = Math.max(0, Math.floor(count * 0.25));
  const varietyShare = count - weakShare - midShare;

  if (topWeak.length > 0) {
    const perWeak = Math.ceil(weakShare / topWeak.length);
    topWeak.forEach((t) => {
      distribution.push({ topic: t.topic, weight: Math.round((perWeak / count) * 100) });
    });
  }

  if (otherTopics.length > 0 && midShare > 0) {
    const perOther = Math.ceil(midShare / Math.min(otherTopics.length, 3));
    otherTopics.slice(0, 3).forEach((t) => {
      distribution.push({ topic: t, weight: Math.round((perOther / count) * 100) });
    });
  }

  return distribution;
}

/**
 * Pick questions for a session based on weak topics.
 * Returns { questions: [], usage: { weakReviewed, varietyAdded } }
 */
export function buildAdaptiveSession(fullBank, weakTopics, count = 10) {
  const weakTopicNames = new Set((weakTopics || []).map((t) => t.topic));

  // Separate bank into weak and strong topics
  const weakQuestions = fullBank.filter((q) => weakTopicNames.has(q.topic));
  const strongQuestions = fullBank.filter((q) => !weakTopicNames.has(q.topic));

  const shuffledWeak = shuffle([...weakQuestions]);
  const shuffledStrong = shuffle([...strongQuestions]);

  const weakCount = Math.min(shuffledWeak.length, Math.max(2, Math.ceil(count * 0.5)));
  const strongCount = Math.min(shuffledStrong.length, count - weakCount);

  const session = [
    ...shuffledWeak.slice(0, weakCount),
    ...shuffledStrong.slice(0, strongCount),
  ];

  // Fill remaining slots with any questions if we don't have enough
  if (session.length < count) {
    const remaining = shuffle(fullBank.filter(
      (q) => !session.find((s) => s.questionText === q.questionText)
    ));
    session.push(...remaining.slice(0, count - session.length));
  }

  return shuffle(session);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
