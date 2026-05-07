import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';
import useLeaderboardStore from '../stores/useLeaderboardStore';

export default function LeaderboardPage({ user }) {
  const { entries, fetchLeaderboard } = useLeaderboardStore();

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const stats = useMemo(() => {
    const totalPlayers = entries.length;
    const userIdx = user
      ? entries.findIndex((e) => e.userId === user.uid)
      : -1;
    const yourRank = userIdx >= 0 ? userIdx + 1 : null;
    const gap =
      userIdx > 0
        ? entries[userIdx - 1]?.points - entries[userIdx]?.points
        : null;
    const aboveName =
      userIdx > 0 ? entries[userIdx - 1]?.displayName : null;
    return { totalPlayers, yourRank, gap, aboveName };
  }, [entries, user]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Gothic Filigree Border */}
      <div className="filigree-top">
        <div className="corner-ornament corner-ornament-tl"></div>
        <div className="corner-ornament corner-ornament-tr"></div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-white/40 transition-colors hover:text-blood font-body"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold gradient-text">Leaderboard</h1>
        <p className="mt-1 text-sm text-white/40 font-body">
          Compare your scores, track rankings, and climb the ladder
        </p>
      </div>

      {/* Stats Bar */}
      <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-gold/10 bg-gold-dim">
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold text-parchment">
            {stats.totalPlayers} <span className="text-gold">Players</span>
          </p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">On the Board</p>
        </div>
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold text-parchment">
            {stats.yourRank ? (
              <><span className="text-gold">#{stats.yourRank}</span> Your Rank</>
            ) : (
              <span className="text-white/30">—</span>
            )}
          </p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">Current Standing</p>
        </div>
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold text-parchment">
            {stats.gap !== null && stats.aboveName ? (
              <><span className="text-gold">{stats.gap}</span> Points</>
            ) : user ? (
              <span className="text-gold">#1</span>
            ) : (
              <span className="text-white/30">—</span>
            )}
          </p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">
            {stats.gap !== null && stats.aboveName
              ? `From ${stats.aboveName}`
              : user
                ? 'You&apos;re at the top!'
                : 'Sign in to compete'}
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-white/80">
            Rankings
          </h2>
        </div>
        <div className="p-6">
          <Leaderboard compact={false} userId={user?.uid} showSkillSelector />
        </div>
      </div>
    </div>
  );
}
