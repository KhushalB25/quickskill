import { useEffect, useState, useMemo, useRef } from 'react';
import useLeaderboardStore from '../stores/useLeaderboardStore';
import useSkillStore from '../stores/useSkillStore';

/* ─── helpers ──────────────────────────────────── */

const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

function RankIcon({ change }) {
  if (change === null) return null;
  if (change > 0)
    return <span className="rank-change up">↑ {change}</span>;
  if (change < 0)
    return <span className="rank-change down">↓ {Math.abs(change)}</span>;
  return <span className="rank-change same">— 0</span>;
}

function Avatar({ entry, size = 'md' }) {
  const sizeClasses = size === 'lg'
    ? 'h-14 w-14 rounded-xl text-xl'
    : size === 'sm'
      ? 'h-8 w-8 rounded-lg text-xs'
      : 'h-9 w-9 rounded-lg text-sm';

  if (entry.photoURL) {
    return (
      <div className={`${sizeClasses} shrink-0 overflow-hidden border border-white/[0.06]`}>
        <img src={entry.photoURL} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  const initial = entry.displayName?.charAt(0)?.toUpperCase() || '?';
  return (
    <div className={`${sizeClasses} flex items-center justify-center bg-gradient-blood/20 font-bold gradient-text font-display shrink-0`}>
      {initial}
    </div>
  );
}

/* ─── Podium ───────────────────────────────────── */

function Podium({ top3 }) {
  if (top3.length < 3) return null;

  const [first, second, third] = top3;

  return (
    <div className="podium-grid">
      {/* 2nd place */}
      <div className="podium-item podium-2 animate-fade-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
        <div className="podium-rank">2</div>
        <Avatar entry={second} size="lg" />
        <div className="podium-name">{second.displayName}</div>
        <div className="podium-score">{second.points.toLocaleString()} <span>pts</span></div>
        <span className="podium-badge">{second.accuracy}% acc</span>
      </div>

      {/* 1st place */}
      <div className="podium-item podium-1 animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
        <div className="podium-crown">👑</div>
        <div className="podium-rank">1</div>
        <Avatar entry={first} size="lg" />
        <div className="podium-name">{first.displayName}</div>
        <div className="podium-score">{first.points.toLocaleString()} <span>pts</span></div>
        <span className="podium-badge">🏆 Champion</span>
      </div>

      {/* 3rd place */}
      <div className="podium-item podium-3 animate-fade-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <div className="podium-rank">3</div>
        <Avatar entry={third} size="lg" />
        <div className="podium-name">{third.displayName}</div>
        <div className="podium-score">{third.points.toLocaleString()} <span>pts</span></div>
        <span className="podium-badge">{third.accuracy}% acc</span>
      </div>
    </div>
  );
}

/* ─── Hover Card ───────────────────────────────── */

function HoverCard({ entry }) {
  const skills = useSkillStore((s) => s.skills);
  const topSkills = useMemo(() => {
    if (!entry.progress) return [];
    return Object.entries(entry.progress)
      .map(([skillId, sp]) => {
        const skill = skills.find((s) => s.id === skillId);
        return {
          name: skill?.name || skillId,
          score: sp.lastScore || 0,
          correct: sp.totalCorrect || 0,
        };
      })
      .filter((s) => s.correct > 0)
      .sort((a, b) => b.correct - a.correct)
      .slice(0, 5);
  }, [entry.progress, skills]);

  if (topSkills.length === 0) return null;

  return (
    <div className="hover-card">
      <h4 className="hover-card-title">{entry.displayName}</h4>
      <div className="hover-card-body">
        {topSkills.map((s) => (
          <div key={s.name} className="hover-skill-row">
            <span className="hover-skill-name">{s.name}</span>
            <span className="hover-skill-score">{s.score}%</span>
          </div>
        ))}
      </div>
      <div className="hover-card-footer">
        <span>Total sessions: {entry.sessionCount}</span>
        <span>Accuracy: {entry.accuracy}%</span>
      </div>
    </div>
  );
}

/* ─── Rank Row ─────────────────────────────────── */

function RankRow({ entry, rank, isYou }) {
  return (
    <div className={`rank-row group ${isYou ? 'is-you' : ''}`}>
      <div className="rank-number">{rank}</div>

      <Avatar entry={entry} />

      <div className="rank-info">
        <div className="rank-name">
          {entry.displayName}
          {isYou && <span className="you-badge">YOU</span>}
          <RankIcon change={entry.rankChange} />
        </div>
        <div className="rank-meta">
          {entry.accuracy}% accuracy
          {entry.sessionCount > 0 && <span>· {entry.sessionCount} sessions</span>}
        </div>
      </div>

      <div className="rank-stats">
        <div className="rank-stat">
          <div className="rank-stat-value">{entry.points.toLocaleString()}</div>
          <div className="rank-stat-label">Pts</div>
        </div>
      </div>

      <HoverCard entry={entry} />
    </div>
  );
}

/* ─── Leaderboard Skeleton ─────────────────────── */

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="h-5 w-5 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-9 w-9 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-2 w-16 rounded bg-white/[0.02] animate-pulse" />
          </div>
          <div className="h-4 w-12 rounded bg-white/[0.04] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* ─── Empty State ──────────────────────────────── */

function EmptyState({ selectedSkill }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m0 0a6.023 6.023 0 01-2.77-.896" />
        </svg>
      </div>
      <div className="empty-title">
        {selectedSkill
          ? 'No scores yet for this skill'
          : 'No leaderboard data yet'}
      </div>
      <div className="empty-sub">
        {selectedSkill
          ? 'Be the first to train and claim the #1 spot'
          : 'Start training to appear on the leaderboard'}
      </div>
    </div>
  );
}

/* ─── Next-Rank Banner ─────────────────────────── */

function NextRankBanner({ userId, period, entries }) {
  const nextRank = useLeaderboardStore((s) => s.getNextRankInfo)(userId, period);
  if (!nextRank) return null;

  return (
    <div className="next-rank-banner">
      <div className="next-rank-text">
        You're <strong>{nextRank.pointsGap} points</strong> away from{' '}
        <strong>#{nextRank.aboveRank} {nextRank.aboveName}</strong>
      </div>
      <div className="next-rank-progress">
        <div className="next-rank-bar">
          <div className="next-rank-fill" style={{ width: `${nextRank.progress}%` }} />
        </div>
        <div className="next-rank-number">{nextRank.progress}%</div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────── */

export default function Leaderboard({ compact = false, userId, showSkillSelector = false }) {
  const { entries, loading, error, fetchLeaderboard, getFilteredEntries, getSkillLeaderboard, period, setPeriod } =
    useLeaderboardStore();
  const { skills } = useSkillStore();
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [activePeriod, setActivePeriod] = useState('all');
  const prevUserIdRef = useRef(userId);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Refresh leaderboard when user changes (e.g., after sign-in)
  useEffect(() => {
    if (userId && prevUserIdRef.current !== userId) {
      fetchLeaderboard();
      prevUserIdRef.current = userId;
    }
  }, [userId, fetchLeaderboard]);

  // Filter by time period
  const periodEntries = useMemo(
    () => getFilteredEntries(activePeriod),
    [entries, activePeriod, getFilteredEntries]
  );

  // Filter by skill
  const displayEntries = useMemo(() => {
    let list = periodEntries;
    if (selectedSkill) {
      const skillLB = getSkillLeaderboard(selectedSkill);
      const skillUserIds = new Set(skillLB.map((e) => e.userId));
      list = list.filter((e) => skillUserIds.has(e.userId));
    }
    if (compact) list = list.slice(0, 5);
    return list;
  }, [periodEntries, selectedSkill, compact, entries, getSkillLeaderboard]);

  const handlePeriodChange = (key) => {
    setActivePeriod(key);
    setPeriod(key);
  };

  /* ── Loading State ─────────────────────────── */
  if (loading && entries.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="spinner-neural" />
      </div>
    );
  }

  /* ── Error State ───────────────────────────── */
  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-300 font-body">
        {error}
      </div>
    );
  }

  const top3 = displayEntries.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* ── Time Period Tabs ── */}
      {!compact && (
        <div className="time-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePeriodChange(p.key)}
              className={`time-tab ${activePeriod === p.key ? 'active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Skill Filter Chips ── */}
      {showSkillSelector && skills.length > 0 && (
        <div className="skill-filters">
          <button
            onClick={() => setSelectedSkill(null)}
            className={`skill-chip ${!selectedSkill ? 'active' : ''}`}
          >
            All Skills
          </button>
          {skills.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSkill(s.id)}
              className={`skill-chip ${selectedSkill === s.id ? 'active' : ''}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Podium ── */}
      {!compact && displayEntries.length >= 3 && (
        <Podium top3={top3} />
      )}

      {/* ── Rank List ── */}
      {displayEntries.length === 0 ? (
        <EmptyState selectedSkill={selectedSkill} />
      ) : (
        <div className="rank-list">
          {displayEntries.map((entry, i) => (
            <RankRow
              key={entry.userId + (selectedSkill || '')}
              entry={entry}
              rank={i + 1}
              isYou={userId && entry.userId === userId}
            />
          ))}
        </div>
      )}

      {/* ── Loading overlay for refresh ── */}
      {loading && entries.length > 0 && (
        <div className="flex justify-center py-2">
          <div className="spinner-neural !h-5 !w-5" />
        </div>
      )}

      {/* ── Next-rank Banner ── */}
      {!compact && userId && displayEntries.length > 0 && (
        <NextRankBanner userId={userId} period={activePeriod} entries={displayEntries} />
      )}
    </div>
  );
}
