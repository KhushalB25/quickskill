import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  arrayUnion,
  db,
} from '../firebase';

/**
 * Sanitize a topic name for use as a Firestore field path.
 * Firestore field paths cannot contain '~', '*', '/', '[', or ']'.
 * Replace them with safe underscores.
 */
function sanitizeTopicPath(topic) {
  return String(topic).replace(/[~*/\[\]]/g, '_').replace(/\//g, '_');
}

const useProgressStore = create(
  persist(
    (set, get) => ({
      progress: {},
      totalCorrect: 0,
      totalAttempted: 0,
      loading: false,
      error: null,

      fetchProgress: async (userId) => {
        if (!userId) return;
        set({ loading: true, error: null });
        try {
          const ref = doc(db, 'users', userId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            const progress = data.progress?.skills || {};
            const totalCorrect = data.totalCorrect || 0;
            const totalAttempted = data.totalAttempted || 0;
            set({ progress, totalCorrect, totalAttempted, loading: false });
          } else {
            await setDoc(ref, {
              progress: { skills: {} },
              totalCorrect: 0,
              totalAttempted: 0,
              lastActive: serverTimestamp(),
              createdAt: serverTimestamp(),
            }, { merge: true });
            set({ progress: {}, totalCorrect: 0, totalAttempted: 0, loading: false });
          }
        } catch (err) {
          set({ error: err.message, loading: false });
        }
      },

      recordCorrectAnswer: async (userId, skillId, topic) => {
        if (!userId) return;
        const { progress, totalCorrect, totalAttempted } = get();
        const skillProgress = progress[skillId] || {
          totalCorrect: 0,
          lastScore: 0,
          lastPracticed: null,
          topicScores: {},
          wrongQuestions: [],
          sessions: [],
        };

        const topicScores = { ...(skillProgress.topicScores || {}) };
        if (topic) {
          topicScores[topic] = topicScores[topic] || { correct: 0, wrong: 0, total: 0 };
          topicScores[topic] = {
            correct: topicScores[topic].correct + 1,
            wrong: topicScores[topic].wrong,
            total: topicScores[topic].total + 1,
          };
        }

        const updatedSkillProgress = {
          totalCorrect: (skillProgress.totalCorrect || 0) + 1,
          lastScore: Math.min(100, (skillProgress.lastScore || 0) + 10),
          lastPracticed: new Date().toISOString(),
          topicScores,
          wrongQuestions: skillProgress.wrongQuestions || [],
          sessions: skillProgress.sessions || [],
        };

        set({
          progress: {
            ...progress,
            [skillId]: updatedSkillProgress,
          },
          totalCorrect: totalCorrect + 1,
          totalAttempted: totalAttempted + 1,
        });

        try {
          const userRef = doc(db, 'users', userId);
          const updates = {
            [`progress.skills.${skillId}.totalCorrect`]: increment(1),
            [`progress.skills.${skillId}.lastScore`]: updatedSkillProgress.lastScore,
            [`progress.skills.${skillId}.lastPracticed`]: serverTimestamp(),
            totalCorrect: increment(1),
            totalAttempted: increment(1),
            lastActive: serverTimestamp(),
          };
          if (topic) {
            const safeTopic = sanitizeTopicPath(topic);
            updates[`progress.skills.${skillId}.topicScores.${safeTopic}.correct`] = increment(1);
            updates[`progress.skills.${skillId}.topicScores.${safeTopic}.total`] = increment(1);
          }
          await updateDoc(userRef, updates);
        } catch (err) {
          console.error('Failed to save progress:', err);
        }
      },

      recordWrongAnswer: async (userId, skillId, question, userAnswer) => {
        if (!userId) return;
        const { progress, totalAttempted } = get();
        const skillProgress = progress[skillId] || { topicScores: {}, wrongQuestions: [], sessions: [] };

        const topicScores = { ...(skillProgress.topicScores || {}) };
        const topic = question.topic || 'general';
        topicScores[topic] = topicScores[topic] || { correct: 0, wrong: 0, total: 0 };
        topicScores[topic] = {
          correct: topicScores[topic].correct,
          wrong: topicScores[topic].wrong + 1,
          total: topicScores[topic].total + 1,
        };

        const wrongEntry = {
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          userAnswer,
          topic,
          explanation: question.explanation || '',
          timestamp: new Date().toISOString(),
        };

        const wrongQuestions = [...(skillProgress.wrongQuestions || []), wrongEntry].slice(-50);

        set({
          progress: {
            ...progress,
            [skillId]: {
              ...skillProgress,
              topicScores,
              wrongQuestions,
            },
          },
          totalAttempted: totalAttempted + 1,
        });

        try {
          const userRef = doc(db, 'users', userId);
          const trimmedWrong = wrongQuestions.slice(-50);
          const safeTopic = sanitizeTopicPath(topic);
          const updates = {
            [`progress.skills.${skillId}.topicScores.${safeTopic}.wrong`]: increment(1),
            [`progress.skills.${skillId}.topicScores.${safeTopic}.total`]: increment(1),
            [`progress.skills.${skillId}.wrongQuestions`]: trimmedWrong,
            totalAttempted: increment(1),
            lastActive: serverTimestamp(),
          };
          await setDoc(userRef, updates, { merge: true });
        } catch (err) {
          console.error('Failed to save wrong answer:', err);
        }
      },

      recordDailyChallenge: async (userId, date) => {
        if (!userId) return;
        try {
          await setDoc(doc(db, 'users', userId, 'dailyChallenges', date), {
            completed: true,
            completedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error('Failed to record daily challenge:', err);
        }
      },

      addSession: async (userId, skillId, session) => {
        if (!userId) return;
        const { progress } = get();
        const skillProgress = progress[skillId] || { sessions: [] };
        const sessions = [...(skillProgress.sessions || []), session].slice(-30);

        set({
          progress: {
            ...progress,
            [skillId]: { ...skillProgress, sessions },
          },
        });

        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            [`progress.skills.${skillId}.sessions`]: arrayUnion(session),
          });
        } catch (err) {
          console.error('Failed to save session:', err);
        }
      },

      // ─── Per-user question bank ────────────────────────────────

      fetchUserQuestionBank: async (userId, skillId, defaultQuestions) => {
        if (!userId) return defaultQuestions || [];
        try {
          const ref = doc(db, 'users', userId, 'questionBank', skillId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            return snap.data().questions || defaultQuestions || [];
          }
          // First visit: copy seeded questions into user's bank
          if (defaultQuestions?.length > 0) {
            await setDoc(ref, {
              questions: defaultQuestions,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          return defaultQuestions || [];
        } catch (err) {
          console.error('Failed to fetch question bank:', err);
          return defaultQuestions || [];
        }
      },

      saveUserQuestionBank: async (userId, skillId, questions) => {
        if (!userId) return;
        try {
          // Sanitize topic names so they work as Firestore field paths
          const sanitized = questions.map((q) => ({
            ...q,
            topic: sanitizeTopicPath(q.topic || 'general'),
          }));
          const ref = doc(db, 'users', userId, 'questionBank', skillId);

          // Merge with existing bank instead of overwriting — keeps a larger pool
          const existing = await getDoc(ref);
          let merged = sanitized;
          if (existing.exists()) {
            const existingQuestions = existing.data().questions || [];
            const seen = new Set(sanitized.map((q) => q.questionText));
            // Keep existing questions that aren't duplicated by new ones
            const kept = existingQuestions.filter((q) => !seen.has(q.questionText));
            merged = [...kept, ...sanitized].slice(-60); // keep up to 60 questions
          }

          await setDoc(ref, {
            questions: merged,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error('Failed to save question bank:', err);
        }
      },

      setProgress: (progress) => set({ progress }),
      setTotalCorrect: (totalCorrect) => set({ totalCorrect }),
    }),
    {
      name: 'quickskill-progress',
      partialize: (state) => ({
        progress: state.progress,
        totalCorrect: state.totalCorrect,
        totalAttempted: state.totalAttempted,
      }),
    }
  )
);

export default useProgressStore;
