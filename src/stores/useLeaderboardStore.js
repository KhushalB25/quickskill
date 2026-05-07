import { create } from 'zustand';
import { collection, query, orderBy, limit, getDocs, db } from '../firebase';

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getMonthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function computePoints(totalCorrect, accuracyPct) {
  return Math.round(totalCorrect * (100 + Math.round(accuracyPct)) / 10);
}

function getAccuracy(totalCorrect, totalAttempted) {
  if (!totalAttempted || totalAttempted === 0) return 0;
  return Math.round((totalCorrect / totalAttempted) * 100);
}

function getSessionCount(progress) {
  let count = 0;
  Object.values(progress).forEach((skill) => {
    count += (skill.sessions?.length || 0);
  });
  return count;
}

function getLastActive(progress) {
  let latest = null;
  Object.values(progress).forEach((skill) => {
    if (skill.lastPracticed && (!latest || skill.lastPracticed > latest)) {
      latest = skill.lastPracticed;
    }
  });
  return latest;
}

function isWithinPeriod(dateVal, period) {
  if (!dateVal) return false;
  const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal.toDate?.() || new Date(dateVal);
  if (isNaN(date.getTime())) return false;

  if (period === 'week') return date >= getWeekStart();
  if (period === 'month') return date >= getMonthStart();
  return true; // all time
}

function loadStoredRanks() {
  try {
    const stored = localStorage.getItem('quickskill-ranks');
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function saveRanks(rankMap) {
  try {
    localStorage.setItem('quickskill-ranks', JSON.stringify(rankMap));
  } catch { /* ignore */ }
}

function computeRankChange(userId, currentRank, storedRanks) {
  const prev = storedRanks[userId];
  if (prev === undefined) return null; // new entry
  if (prev === currentRank) return 0;
  return prev - currentRank; // positive = climbed, negative = dropped
}

const useLeaderboardStore = create((set, get) => ({
  entries: [],
  skillEntries: {},
  loading: false,
  error: null,
  period: 'all',

  setPeriod: (period) => set({ period }),

  fetchLeaderboard: async () => {
    set({ loading: true, error: null });
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('totalCorrect', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const storedRanks = loadStoredRanks();

      const rawEntries = snapshot.docs.map((doc) => {
        const data = doc.data();
        const progress = data.progress?.skills || {};
        const totalCorrect = data.totalCorrect || 0;
        const totalAttempted = data.totalAttempted || 0;
        const accuracy = getAccuracy(totalCorrect, totalAttempted);
        const sessionCount = getSessionCount(progress);
        const lastActive = data.lastActive?.toDate?.()?.toISOString() || getLastActive(progress);

        return {
          userId: doc.id,
          displayName: data.displayName || (data.email ? data.email.split('@')[0] : 'Unknown'),
          photoURL: data.photoURL || null,
          totalCorrect,
          totalAttempted,
          accuracy,
          points: computePoints(totalCorrect, accuracy),
          sessionCount,
          lastActive,
          progress,
          email: data.email || '',
        };
      });

      // Rank by points descending
      const sorted = rawEntries.sort((a, b) => b.points - a.points);

      // Assign ranks and compute changes
      const entries = sorted.map((entry, i) => {
        const rank = i + 1;
        const change = computeRankChange(entry.userId, rank, storedRanks);
        return { ...entry, rank, rankChange: change };
      });

      // Store current ranks for next comparison
      const rankMap = {};
      entries.forEach((e) => { rankMap[e.userId] = e.rank; });
      saveRanks(rankMap);

      set({ entries, loading: false });
    } catch (err) {
      if (err.code === 'failed-precondition') {
        set({
          error: 'Index required. Create it: Firestore > Indexes > Add composite index: users collection, totalCorrect descending.',
          loading: false,
        });
      } else {
        set({ error: err.message, loading: false });
      }
    }
  },

  getFilteredEntries: (period) => {
    const { entries } = get();
    const p = period || get().period;
    if (p === 'all') return entries;
    return entries.filter((e) => isWithinPeriod(e.lastActive, p));
  },

  getSkillLeaderboard: (skillId) => {
    const { entries } = get();
    if (!skillId) return [];

    return entries
      .map((e) => {
        const sp = e.progress?.[skillId] || {};
        const correct = sp.totalCorrect || 0;
        return {
          userId: e.userId,
          displayName: e.displayName,
          photoURL: e.photoURL,
          totalCorrect: correct,
          lastScore: sp.lastScore || 0,
        };
      })
      .filter((e) => e.totalCorrect > 0)
      .sort((a, b) => b.totalCorrect - a.totalCorrect)
      .slice(0, 10);
  },

  getNextRankInfo: (userId, period) => {
    const entries = get().getFilteredEntries(period);
    const userIdx = entries.findIndex((e) => e.userId === userId);
    if (userIdx <= 0) return null;
    const user = entries[userIdx];
    const above = entries[userIdx - 1];
    const gap = above.points - user.points;
    const total = above.points + user.points;
    const progress = total > 0 ? Math.round((user.points / above.points) * 100) : 0;
    return {
      rank: userIdx + 1,
      aboveName: above.displayName,
      aboveRank: userIdx,
      pointsGap: gap,
      progress: Math.min(progress, 99),
    };
  },
}));

export default useLeaderboardStore;
