import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const ALL_ACHIEVEMENTS = [
  { id: 'first-correct', name: 'First Steps', description: 'Answer your first question correctly', icon: '🎯' },
  { id: 'perfect-score', name: 'Perfectionist', description: 'Score 100% on any skill', icon: '💎' },
  { id: 'speed-demon', name: 'Speed Demon', description: 'Answer correctly in under 5 seconds', icon: '⚡' },
  { id: 'streak-3', name: 'On Fire', description: 'Maintain a 3-day training streak', icon: '🔥' },
  { id: 'streak-7', name: 'Week Warrior', description: 'Maintain a 7-day training streak', icon: '📅' },
  { id: 'streak-30', name: 'Monthly Master', description: 'Maintain a 30-day training streak', icon: '👑' },
  { id: 'total-10', name: 'Getting Started', description: 'Answer 10 questions correctly', icon: '⭐' },
  { id: 'total-50', name: 'Dedicated', description: 'Answer 50 questions correctly', icon: '🌟' },
  { id: 'total-100', name: 'Centurion', description: 'Answer 100 questions correctly', icon: '💫' },
  { id: 'total-500', name: 'Brain Champion', description: 'Answer 500 questions correctly', icon: '🏆' },
  { id: 'all-skills', name: 'Jack of All Trades', description: 'Practice every skill at least once', icon: '🎪' },
  { id: 'skill-master', name: 'Skill Master', description: 'Get 100% on any skill 3 times', icon: '🧠' },
];

const useAchievementStore = create(
  persist(
    (set, get) => ({
      achievements: ALL_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false, unlockedAt: null })),
      newlyUnlocked: [],

      unlock: (id) => {
        const { achievements } = get();
        const existing = achievements.find((a) => a.id === id);
        if (!existing || existing.unlocked) return;

        const updated = achievements.map((a) =>
          a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
        );

        set({
          achievements: updated,
          newlyUnlocked: [...get().newlyUnlocked, id],
        });
      },

      checkAndUnlock: (stats) => {
        const { achievements } = get();

        // first correct answer
        if (stats.totalCorrect >= 1 && !achievements.find((a) => a.id === 'first-correct')?.unlocked) {
          get().unlock('first-correct');
        }
        // perfect score
        if (stats.lastScore === 100 && !achievements.find((a) => a.id === 'perfect-score')?.unlocked) {
          get().unlock('perfect-score');
        }
        // total milestones
        [10, 50, 100, 500].forEach((n) => {
          const key = `total-${n}`;
          if (stats.totalCorrect >= n && !achievements.find((a) => a.id === key)?.unlocked) {
            get().unlock(key);
          }
        });
        // streak milestones
        [3, 7, 30].forEach((n) => {
          const key = `streak-${n}`;
          if (stats.currentStreak >= n && !achievements.find((a) => a.id === key)?.unlocked) {
            get().unlock(key);
          }
        });
      },

      clearNewlyUnlocked: () => set({ newlyUnlocked: [] }),
    }),
    { name: 'everyai-achievements' }
  )
);

export default useAchievementStore;
