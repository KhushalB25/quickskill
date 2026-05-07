import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useSkillStore from '../stores/useSkillStore';
import useProgressStore from '../stores/useProgressStore';
import useStreakStore from '../stores/useStreakStore';
import useAchievementStore from '../stores/useAchievementStore';
import QuestionCard from '../components/QuestionCard';
import Confetti from '../components/Confetti';
import { playCorrect, playWrong, playComplete } from '../utils/sound';
import { generateQuestions } from '../utils/aiQuestions';
import { computeWeakTopics, buildTopicDistribution } from '../utils/adaptiveEngine';

/**
 * Compute topic distribution to stock each focus area to target count.
 * Returns an array of {topic, weight} for the AI prompt.
 */
function computeTopicDeficit(existingBank, allSeedTopics, target = 10, totalSlots = 15) {
  const counts = {};
  existingBank.forEach((q) => {
    const t = q.topic || 'general';
    counts[t] = (counts[t] || 0) + 1;
  });

  const uniqueTopics = [...new Set([...Object.keys(counts), ...allSeedTopics])];
  const deficit = uniqueTopics
    .map((topic) => ({ topic, deficit: Math.max(0, target - (counts[topic] || 0)) }))
    .filter((d) => d.deficit > 0);

  if (deficit.length === 0) return [];

  const totalDeficit = deficit.reduce((s, d) => s + d.deficit, 0);
  return deficit.map((d) => ({
    topic: d.topic,
    weight: Math.round((d.deficit / totalDeficit) * 100),
  }));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getTopics(questions) {
  const map = {};
  questions.forEach((q) => {
    const t = q.topic || 'general';
    if (!map[t]) map[t] = 0;
    map[t]++;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function filterByTopics(questions, sessionTopics) {
  if (!sessionTopics || sessionTopics.length === 0) return shuffle(questions);
  return shuffle(questions.filter((q) => sessionTopics.includes(q.topic)));
}

const topicDescriptions = {
  'number-patterns': 'Detect mathematical sequences, prime numbers, and numeric relationships',
  'letter-patterns': 'Spot alphabetical sequences and letter-based logical patterns',
  'sequence-detection': 'Identify recurring patterns and predict what comes next',
  'visual-patterns': 'Recognize patterns in shapes, symbols, and visual arrangements',
  'word-patterns': 'Discover linguistic patterns in spelling, grammar, and word forms',
  'word-meanings': 'Build vocabulary by learning definitions and correct usage',
  synonyms: 'Expand your lexicon by learning words with similar meanings',
  spelling: 'Master tricky spellings and avoid common spelling mistakes',
  'word-usage': 'Learn how to use words correctly in different contexts',
  antonyms: 'Strengthen vocabulary through words with opposite meanings',
  'word-forms': 'Understand how words change form across different parts of speech',
  multiplication: 'Sharpen multiplication skills with quick mental calculations',
  percentages: 'Master percentage calculations for everyday math',
  division: 'Build confidence with division and divisibility rules',
  'order-of-operations': 'Practice the correct sequence of arithmetic operations (PEMDAS/BODMAS)',
  'squares-roots': 'Memorize perfect squares and calculate square roots mentally',
  addition: 'Speed up mental addition with smart shortcuts and strategies',
  fractions: 'Work confidently with fractions, parts, and proportional reasoning',
  exponents: 'Understand powers, exponents, and exponential growth patterns',
  averages: 'Calculate and interpret mean, median, and range in data sets',
  'numerical-memory': 'Train your brain to remember numbers, digits, and sequences',
  'geography-memory': 'Recall countries, capitals, landmarks, and geographical facts',
  'science-memory': 'Memorize scientific facts, elements, and natural phenomena',
  'history-memory': 'Retain key historical dates, events, and figures',
  'deductive-reasoning': 'Draw logical conclusions from given premises and facts',
  'conditional-logic': 'Reason through if-then statements and logical implications',
  'ordering-logic': 'Solve problems involving ranking, ordering, and transitive relationships',
  'lateral-thinking': 'Solve puzzles that require creative, non-obvious approaches',
  'modular-arithmetic': 'Use remainder-based reasoning for cycles and patterns',
  'word-logic': 'Solve logic puzzles that play with language and word meanings',
  'word-connections': 'Find links between words and build associative vocabulary',
  analogies: 'Understand relationships between concepts through A-is-to-B comparisons',
  categorization: 'Sort items into groups and spot what doesn\'t belong',
  'thematic-links': 'Connect ideas around common themes and subjects',
  'word-types': 'Identify different kinds of words and their grammatical functions',
  prefixes: 'Learn how prefixes change word meanings at the beginning',
  suffixes: 'Understand how suffixes modify word meanings at the end',
  '3d-shapes': 'Visualize and analyze three-dimensional geometric objects',
  'visual-projection': 'Imagine how objects look from different viewpoints and angles',
  'cross-sections': 'Predict the shape created by slicing through 3D objects',
  nets: 'Determine which flat patterns fold into three-dimensional shapes',
  rotation: 'Understand how shapes behave when rotated in space',
  'visual-logic': 'Apply logical reasoning to visual and spatial problems',
  'quick-categorization': 'Rapidly sort items into categories and spot differences',
  'quick-comparison': 'Make fast comparisons between sizes, quantities, and attributes',
  'quick-ordering': 'Arrange items in sequence quickly without hesitation',
  'quick-identification': 'Rapidly identify properties like primes, patterns, and types',
  'lateral-thinking-reflexes': 'Think outside the box under time pressure',
  'functional-fixedness': 'Break mental blocks by seeing new uses for familiar objects',
  'divergent-thinking': 'Generate multiple creative solutions to open-ended problems',
  'problem-solving': 'Tackle puzzles that require step-by-step reasoning and insight',
  'creative-visualization': 'Use imagination to visualize concepts and solve visual puzzles',
  'creative-language': 'Play with words, metaphors, and creative linguistic expression',
  'lateral-creativity': 'Solve riddles that challenge assumptions and spark new ideas',
  'reading-others': 'Interpret body language, tone, and non-verbal communication cues',
  'active-listening': 'Learn to listen attentively and respond with understanding',
  'self-awareness': 'Understand your own emotions, triggers, and behavioral patterns',
  empathy: 'Develop the ability to sense and understand others\' feelings',
  'conflict-resolution': 'Navigate disagreements constructively and find common ground',
  'self-regulation': 'Manage your emotional responses in challenging situations',
  'percentage-calculation': 'Compute percentages quickly for data and real-world scenarios',
  'growth-rate': 'Calculate and interpret rates of change and growth over time',
  median: 'Find the middle value and understand its role in data analysis',
  discounts: 'Calculate sale prices and understand percentage discounts instantly',
  'language-families': 'Explore how languages are related through common ancestry',
  grammar: 'Master the rules that govern sentence structure and word usage',
  'language-facts': 'Discover fascinating trivia about languages around the world',
  'word-formation': 'Learn how new words are created through blending and derivation',
  'writing-systems': 'Explore different scripts and writing systems across cultures',
  'sustained-attention': 'Maintain focus over extended periods without losing concentration',
  'selective-attention': 'Filter out distractions and focus on what matters',
  'divided-attention': 'Manage attention when handling multiple tasks at once',
  'cognitive-biases': 'Recognize the mental shortcuts that distort your thinking',
  'logical-fallacies': 'Identify flawed reasoning and invalid argument structures',
  'argument-analysis': 'Evaluate the strength and validity of different arguments',
  'evidence-evaluation': 'Judge whether evidence supports a claim or not',
  'compound-interest': 'Understand how interest grows on itself over time',
  investing: 'Learn the fundamentals of stocks, portfolios, and investment strategies',
  budgeting: 'Master personal finance planning and money management skills',
  inflation: 'Understand how rising prices affect purchasing power and savings',
  'control-flow': 'Trace how code executes through conditions, loops, and operators',
  algorithms: 'Design step-by-step procedures to solve computational problems',
  debugging: 'Find and fix errors in code with systematic testing techniques',
  'data-structures': 'Learn how data is organized and stored in programming',
  'computational-thinking': 'Think like a programmer by breaking problems into logical steps',
  'science-facts': 'Discover fascinating truths about the natural and physical world',
  'geography-facts': 'Learn about countries, landforms, and Earth\'s diverse geography',
  'history-facts': 'Explore key moments and figures that shaped human history',
  culture: 'Broaden your understanding of arts, traditions, and global heritage',
  inference: 'Read between the lines to understand what a text implies',
  'main-idea': 'Identify the central theme or core message of a passage',
  'authors-purpose': 'Determine why a writer chose specific words and structures',
  'text-analysis': 'Examine how language, structure, and style create meaning',
  'vocabulary-in-context': 'Decipher word meanings using surrounding text and clues',
};

function getTopicDescription(topic, skillName) {
  const formatted = topic.replace(/-/g, ' ');
  if (topicDescriptions[topic]) {
    return topicDescriptions[topic] + ` within ${skillName || 'this skill'}.`;
  }
  // Fallback: generate a description from the topic name
  const article = /^[aeiou]/i.test(formatted) ? 'an' : 'a';
  return `Practice ${article} ${formatted} to strengthen your ${skillName || 'cognitive'} skills.`;
}

/**
 * Fallback: create varied questions from existing bank when AI generation fails.
 * Shuffles options within each question and shuffles the whole set so the
 * user doesn't see the same layout twice.
 */
function mutateQuestionBank(questions) {
  // Create two variants per question to grow the bank
  const mutated = [];
  questions.forEach((q) => {
    // Original but shuffled options
    if (q.options && q.options.length > 0) {
      mutated.push({ ...q, options: shuffle(q.options) });
    } else {
      mutated.push({ ...q });
    }
    // Second variant with rotated options
    if (q.options && q.options.length >= 3) {
      const rotated = [q.options[q.options.length - 1], ...q.options.slice(0, -1)];
      mutated.push({
        ...q,
        questionText: q.questionText,
        options: rotated,
      });
    }
  });
  return shuffle(mutated).slice(0, 15);
}

export default function Training({ user }) {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const skill = useSkillStore((s) => s.getSkillById(skillId));
  const { progress, recordCorrectAnswer, recordWrongAnswer, addSession, fetchUserQuestionBank, saveUserQuestionBank } = useProgressStore();
  const { markActive, currentStreak } = useStreakStore();
  const { checkAndUnlock } = useAchievementStore();

  // Phase: 'select' | 'training' | 'review' | 'finished'
  const [phase, setPhase] = useState('select');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [timedMode, setTimedMode] = useState(false);

  // Training state
  const [questionQueue, setQuestionQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [adaptiveBoost, setAdaptiveBoost] = useState([]);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerActive, setTimerActive] = useState(false);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Background AI generation — starts on topic-selector screen for max lead time
  const [regenerating, setRegenerating] = useState(false);
  const questionsRefreshed = useRef(false);
  const answeredCountRef = useRef(0);       // ref avoids stale closure in handleAnswer
  const pendingGenerationRef = useRef(null); // tracks in-flight AI generation promise
  const preGeneratedRef = useRef(false);    // fires once per visit on the select screen

  const questionBank = skill?.questionBank || [];
  const seedTopics = useMemo(() => [...new Set(questionBank.map((q) => q.topic || 'general'))], [questionBank]);
  const topics = useMemo(() => getTopics(questionBank), [questionBank]);

  const currentQuestion = questionQueue[currentIndex] || null;
  const skillProgress = progress[skillId] || null;

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  // Generate fresh AI questions in background after training completes
  const generateFreshQuestions = useCallback(async () => {
    if (!user || !skill || answers.length === 0) return;
    setRegenerating(true);

    try {
      // Analyze weak topics from this session + history
      const weakTopics = computeWeakTopics(skillProgress);
      const allTopics = [...new Set(answers.map((a) => a.question.topic).filter(Boolean))];
      const weakDistribution = buildTopicDistribution(weakTopics, allTopics, 15);

      // Load existing bank so AI can avoid duplicates and we can merge
      const existingBank = await fetchUserQuestionBank(user.uid, skillId, questionBank);

      // Also target understocked topics (<10 per focus area) alongside weak topics
      const deficitDistribution = computeTopicDeficit(existingBank, seedTopics, 10, 15);
      const topicDistribution = deficitDistribution.length > 0 ? deficitDistribution : weakDistribution;
      const seenTexts = [...new Set([
        ...answers.map((a) => a.question.questionText),
        ...existingBank.map((q) => q.questionText),
      ])];

      const newQuestions = await generateQuestions(
        skill.name,
        skill.type,
        15,
        selectedTopics.length > 0 ? selectedTopics : [],
        topicDistribution,
        seenTexts
      );

      if (newQuestions.length >= 5) {
        // Merge new AI questions with existing bank (saveUserQuestionBank does dedup internally)
        const merged = [...existingBank, ...newQuestions];
        await saveUserQuestionBank(user.uid, skillId, merged);
        console.log(`[QuickSkill] AI generated ${newQuestions.length} questions, bank now has ${merged.length > 60 ? 60 : merged.length} questions`);
      } else {
        throw new Error('AI returned too few questions');
      }
    } catch (err) {
      console.error('[QuickSkill] Question generation failed, using fallback:', err.message);
      // Fallback: load existing user bank and create variants from it
      const existingBank = await fetchUserQuestionBank(user.uid, skillId, questionBank);
      if (existingBank.length > 0) {
        const fallback = mutateQuestionBank(existingBank);
        const seenKeys = new Set(answers.map((a) => a.question.questionText));
        const preserved = existingBank.filter((q) => !seenKeys.has(q.questionText));
        const merged = [...new Map(
          [...preserved, ...fallback].map((q) => [q.questionText, q])
        ).values()].slice(0, 60);
        console.log(`[QuickSkill] Fallback: existingBank=${existingBank.length} preserved=${preserved.length} fallback=${fallback.length} merged=${merged.length}`);
        await saveUserQuestionBank(user.uid, skillId, merged);
      }
    } finally {
      setRegenerating(false);
    }
  }, [user, skill, skillId, answers, selectedTopics, skillProgress, saveUserQuestionBank, fetchUserQuestionBank, questionBank, seedTopics]);

  // Pre-generate questions while user is on the topic-selector screen (phase='select')
  // Targets understocked topics (<10) so every focus area has enough questions
  const preGenerateQuestions = useCallback(async () => {
    if (!user || !skill) return;
    try {
      const existingBank = await fetchUserQuestionBank(user.uid, skillId, questionBank);
      const seenTexts = existingBank.map((q) => q.questionText);

      // Prioritize topics that have fewer than 10 questions
      const deficit = computeTopicDeficit(existingBank, seedTopics, 10, 15);

      const newQuestions = await generateQuestions(
        skill.name,
        skill.type,
        15,
        [],
        deficit,
        seenTexts
      );

      if (newQuestions.length >= 5) {
        const merged = [...existingBank, ...newQuestions];
        await saveUserQuestionBank(user.uid, skillId, merged);
        const topicCounts = [...new Set(merged.map((q) => q.topic || 'general'))]
          .map((t) => `${t}=${merged.filter((q) => (q.topic || 'general') === t).length}`)
          .join(', ');
        console.log(`[QuickSkill] Pre-generated ${newQuestions.length} questions. Topic counts: ${topicCounts}`);
      }
    } catch (err) {
      // Silent failure — mid-session or post-session gen will cover it
      console.warn('[QuickSkill] Pre-generation skipped (will generate during/after session):', err.message);
    }
  }, [user, skill, skillId, fetchUserQuestionBank, saveUserQuestionBank, questionBank, seedTopics]);

  // Fire pre-generation once when user lands on the topic-selector screen
  useEffect(() => {
    if (phase === 'select' && user && skill && !preGeneratedRef.current) {
      preGeneratedRef.current = true;
      preGenerateQuestions();
    }
  }, [phase, user, skill, preGenerateQuestions]);

  // Start training
  const startTraining = useCallback(async () => {
    let queue;

    if (user) {
      queue = await fetchUserQuestionBank(user.uid, skillId, questionBank);
      console.log(`[QuickSkill] startTraining: loaded ${queue.length} questions, topics=${[...new Set(queue.map(q=>q.topic))].join(',')}`);
    } else {
      queue = [...questionBank];
    }

    // Filter by selected topics
    queue = filterByTopics(queue, selectedTopics.length > 0 ? selectedTopics : null);

    if (queue.length === 0) {
      // Fall back to seeded questions if user bank somehow empty
      queue = filterByTopics(questionBank, selectedTopics.length > 0 ? selectedTopics : null);
    }

    // Filter out previously wrong questions — exact questionText must never repeat
    if (user && skillProgress?.wrongQuestions?.length > 0) {
      const wrongTexts = new Set(skillProgress.wrongQuestions.map((wq) => wq.questionText));
      const before = queue.length;
      queue = queue.filter((q) => !wrongTexts.has(q.questionText));
      if (before !== queue.length) {
        console.log(`[QuickSkill] Filtered out ${before - queue.length} previously wrong questions (topics preserved for boost)`);
      }
    }

    // Boost: inject up to 3 extra questions per historically weak topic into next session
    if (user && skillProgress) {
      const weakTopics = computeWeakTopics(skillProgress);
      const extra = [];
      for (const wt of weakTopics.slice(0, 3)) {
        // Look for unreviewed questions from weak topics across seed + user bank
        const topicQuestions = questionBank.filter(
          (q) => q.topic === wt.topic && !queue.some((q2) => q2.questionText === q.questionText)
        );
        if (topicQuestions.length > 0) {
          extra.push(...shuffle(topicQuestions).slice(0, 3));
        }
      }
      if (extra.length > 0) {
        queue = shuffle([...queue, ...extra]);
        console.log(`[QuickSkill] Boosted session with ${extra.length} weak-topic questions`);
      }
    }

    // Re-pad to 10 minimum after filters (wrong questions removed, weak topics boosted)
    if (queue.length < 10 && questionBank.length > 0) {
      const more = shuffle(questionBank).filter(
        (q) => !queue.some((q2) => q2.questionText === q.questionText)
      );
      queue = shuffle([...queue, ...more.slice(0, 10 - queue.length)]);
    }

    if (timedMode) {
      setTimeRemaining(queue.length * 30);
      setTimerActive(true);
    }

    questionsRefreshed.current = false;
    answeredCountRef.current = 0;
    pendingGenerationRef.current = null;
    setQuestionQueue(queue);
    setCurrentIndex(0);
    setScore(0);
    setTotalAnswered(0);
    setAnswers([]);
    setAdaptiveBoost([]);
    setPhase('training');

    if (user) {
      markActive();
    }
  }, [questionBank, selectedTopics, timedMode, user, markActive, skillId, fetchUserQuestionBank, skillProgress]);

  // Handle answer
  const handleAnswer = useCallback(async (isCorrect, userAnswer) => {
    const question = currentQuestion;
    if (!question) return;

    setAnswers((prev) => [...prev, {
      question,
      isCorrect,
      userAnswer,
    }]);

    if (isCorrect) {
      setScore((s) => s + 1);
      playCorrect();
      if (user) {
        // Fire-and-forget Firestore write — don't block the Next button
        recordCorrectAnswer(user.uid, skillId, question.topic).catch((err) =>
          console.error('Failed to save correct answer:', err)
        );
      }
    } else {
      playWrong();
      if (question.topic) {
        const sameTopic = questionQueue.filter(
          (q, idx) => idx > currentIndex && q.topic === question.topic
        );
        if (sameTopic.length > 0) {
          setAdaptiveBoost((prev) => [...prev, ...sameTopic]);
        }
      }

      if (user) {
        // Fire-and-forget Firestore write
        recordWrongAnswer(user.uid, skillId, question, userAnswer || '').catch((err) =>
          console.error('Failed to save wrong answer:', err)
        );
      }
    }

    setTotalAnswered((a) => a + 1);

    // Start AI generation immediately at Q1 (runs in background while user continues)
    answeredCountRef.current += 1;
    // Only fire if pre-generation on the select screen didn't already start
    if (user && answeredCountRef.current === 1 && !preGeneratedRef.current && !pendingGenerationRef.current) {
      pendingGenerationRef.current = generateFreshQuestions();
      pendingGenerationRef.current.finally(() => {
        pendingGenerationRef.current = null;
      });
    }
  }, [currentQuestion, questionQueue, currentIndex, user, skillId, recordCorrectAnswer, recordWrongAnswer, generateFreshQuestions]);

  // Handle next question
  const handleNext = useCallback(() => {
    const nextIdx = currentIndex + 1;

    if (adaptiveBoost.length > 0 && nextIdx < questionQueue.length) {
      const boosted = [...questionQueue];
      const boostQuestions = [...adaptiveBoost];
      boosted.splice(nextIdx, 0, ...boostQuestions);
      const seen = new Set();
      const deduped = boosted.filter((q, i) => {
        if (i < nextIdx) return true;
        const key = q.questionText;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setAdaptiveBoost([]);
      setQuestionQueue(deduped);
      setCurrentIndex(nextIdx);
      return;
    }

    if (nextIdx < questionQueue.length) {
      setCurrentIndex(nextIdx);
    } else {
      const finalScore = score;
      const finalTotal = totalAnswered;
      const pct = finalTotal > 0 ? Math.round((finalScore / finalTotal) * 100) : 0;

      setPhase('finished');
      setTimerActive(false);

      if (finalScore === finalTotal && finalTotal > 0) {
        setShowConfetti(true);
        playComplete();
      }

      if (user) {
        const sessionData = {
          skillId,
          date: new Date().toISOString(),
          score: finalScore,
          total: finalTotal,
          topics: [...new Set(answers.map((a) => a.question.topic).filter(Boolean))],
        };
        addSession(user.uid, skillId, sessionData).catch(() => {});

        checkAndUnlock({
          totalCorrect: (progress.totalCorrect || 0) + finalScore,
          lastScore: pct,
          currentStreak,
        });
      }
    }
  }, [currentIndex, questionQueue, adaptiveBoost, user, skillId, score, totalAnswered, answers, progress.totalCorrect, addSession, checkAndUnlock, currentStreak]);

  // When training finishes, await mid-session generation or start fresh
  useEffect(() => {
    if (phase === 'finished' && user && answers.length > 0 && !questionsRefreshed.current) {
      questionsRefreshed.current = true;

      if (pendingGenerationRef.current) {
        // Generation already started mid-session; wait silently if still running
        setRegenerating(true);
        pendingGenerationRef.current.finally(() => setRegenerating(false));
      } else {
        // Edge case: fewer than 3 questions answered, start now
        generateFreshQuestions();
      }
    }
  }, [phase, user, answers.length, generateFreshQuestions]);

  // Wrong answers for review
  const wrongAnswers = useMemo(() => answers.filter((a) => !a.isCorrect), [answers]);

  if (!skill) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="glass-card px-8 py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
            <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="font-display text-lg font-semibold text-white/60">Skill not found.</p>
          <Link to="/" className="btn-primary mt-6 inline-block">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
      <Confetti active={showConfetti} />
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-white/40 transition-colors hover:text-blood font-body"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Skills
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">{skill.name}</h1>
            <p className="mt-1 text-sm text-white/40 font-body">{skill.description}</p>
          </div>
          {skillProgress && (
            <div className="glass-card px-4 py-2 text-right text-sm">
              <p className="text-white/40 font-body">Best: <span className="font-semibold text-white/80">{skillProgress.lastScore || 0}%</span></p>
              <p className="text-white/40 font-body">Correct: <span className="font-semibold text-white/80">{skillProgress.totalCorrect || 0}</span></p>
            </div>
          )}
        </div>
      </div>

      {/* ─── TOPIC SELECTOR ─── */}
      {phase === 'select' && (
        <div className="animate-fade-up space-y-6">
          <div className="glass-card p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-white/90 mb-1">Choose Your Focus Areas</h2>
            <p className="text-sm text-white/40 font-body mb-6">
              Select topics you want to practice. Leave all unchecked to practice everything.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {topics.map(([topic, count]) => (
                <button
                  key={topic}
                  onClick={() => {
                    setSelectedTopics((prev) =>
                      prev.includes(topic)
                        ? prev.filter((t) => t !== topic)
                        : [...prev, topic]
                    );
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                    selectedTopics.includes(topic)
                      ? 'border-blood/30 bg-blood/10 text-blood'
                      : 'border-white/[0.06] bg-white/[0.03] text-white/60 hover:border-white/[0.15] hover:text-white/80'
                  }`}
                >
                  <p className="text-sm font-semibold font-display capitalize">{topic.replace(/-/g, ' ')}</p>
                  <p className="text-xs mt-1 text-white/30 font-body leading-relaxed">
                    {getTopicDescription(topic, skill?.name)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Settings card */}
          <div className="glass-card p-6">
            <h3 className="font-display text-base font-semibold text-white/80 mb-4">Session Settings</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={timedMode}
                  onChange={(e) => setTimedMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-white/[0.08] peer-checked:bg-blood/30 transition-colors" />
                <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white/60 transition-all peer-checked:bg-blood peer-checked:translate-x-5`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/80 font-display">Timed Mode</p>
                <p className="text-xs text-white/40 font-body">30 seconds per question</p>
              </div>
            </label>
          </div>

          <button onClick={startTraining} className="btn-primary w-full text-base py-4">
            Start Training
            <svg className="ml-2 h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      )}

      {/* ─── TRAINING PROGRESS ─── */}
      {phase === 'training' && (
        <>
          <div className="mb-6 animate-slide-up">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/40 font-body">
                Question <span className="text-white/70">{currentIndex + 1}</span> of {questionQueue.length}
              </span>
              <div className="flex items-center gap-3">
                {timedMode && timeRemaining !== null && (
                  <span className={`font-mono text-sm ${timeRemaining <= 30 ? 'text-blood' : 'text-white/50'}`}>
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                )}
                <span className="text-white/40 font-body">
                  Score: <span className="text-blood">{score}</span>
                  <span className="text-white/20">/{totalAnswered}</span>
                </span>
              </div>
            </div>
            <div className="progress-neural">
              <div
                className="progress-neural-fill"
                style={{ width: `${((currentIndex + 1) / questionQueue.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="animate-fade-up">
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              onNext={handleNext}
            />
          </div>
        </>
      )}

      {/* ─── CHECKPOINT / REVIEW ─── */}
      {phase === 'review' && (
        <div className="glass-card p-6 sm:p-8 animate-fade-up">
          <h2 className="font-display text-xl font-bold text-white/90 mb-4">Session Review</h2>
          {wrongAnswers.length === 0 ? (
            <p className="text-emerald-300 font-body">No mistakes — perfect round!</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-white/40 font-body">
                Review {wrongAnswers.length} question{wrongAnswers.length !== 1 && 's'} to reinforce your learning:
              </p>
              {wrongAnswers.map((item, i) => (
                <div key={i} className="rounded-xl border border-blood/20 bg-blood/5 p-4">
                  <p className="text-sm font-semibold text-white/80 font-display">{item.question.questionText}</p>
                  <div className="mt-2 space-y-1 text-sm font-body">
                    <p className="text-blood/80">Your answer: <span className="line-through">{item.userAnswer || '(none)'}</span></p>
                    <p className="text-emerald-300">Correct: <span className="font-bold">{item.question.correctAnswer}</span></p>
                  </div>
                  {item.question.explanation && (
                    <div className="mt-2 rounded-lg border border-blood/10 bg-blood/5 px-3 py-2 text-xs text-white/60 font-body">
                      💡 {item.question.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button onClick={() => { setPhase('select'); setAnswers([]); }} className="btn-primary">
              Practice Again
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ─── FINISHED ─── */}
      {phase === 'finished' && (
        <div className="glass-card p-8 text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-blood/20">
            <span className="text-4xl">
              {score === questionQueue.length ? '🎉' : score >= questionQueue.length / 2 ? '👍' : '💪'}
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white">Training Complete!</h2>
          <div className="my-6">
            <span className="font-display text-5xl font-extrabold gradient-text">
              {score}
            </span>
            <span className="text-white/30 font-display text-2xl">/{questionQueue.length}</span>
            <p className="mt-1 text-sm text-white/40 font-body">
              {Math.round((score / questionQueue.length) * 100)}% accuracy
            </p>
          </div>

          {regenerating && <p className="text-sm text-white/30 font-body mb-4">Preparing new questions...</p>}

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => { setPhase('select'); setAnswers([]); }}
              disabled={regenerating}
              className="btn-primary"
            >
              {regenerating ? 'Saving...' : 'Practice Again'}
            </button>
            {wrongAnswers.length > 0 && (
              <button onClick={() => setPhase('review')} className="btn-secondary">
                Review {wrongAnswers.length} Wrong Answer{wrongAnswers.length !== 1 && 's'}
              </button>
            )}
            <button onClick={() => navigate('/')} className="btn-secondary">
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
