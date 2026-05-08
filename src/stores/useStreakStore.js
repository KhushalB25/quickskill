import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isYesterday(key) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return key === y;
}

const useStreakStore = create(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      activeDates: [],

      markActive: () => {
        const today = getTodayKey();
        const state = get();
        const { lastActiveDate, activeDates } = state;

        if (lastActiveDate === today) return; // already marked today

        const newDates = [...activeDates, today].slice(-90); // keep last 90 days
        let newStreak = 1;

        if (lastActiveDate && isYesterday(lastActiveDate)) {
          newStreak = state.currentStreak + 1;
        }

        const newLongest = Math.max(newStreak, state.longestStreak);

        set({
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
          activeDates: newDates,
        });
      },

      resetStreak: () => {
        set({ currentStreak: 0 });
      },
    }),
    {
      name: 'everyai-streak',
    }
  )
);

export default useStreakStore;
