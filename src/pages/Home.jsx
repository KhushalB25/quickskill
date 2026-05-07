import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useSkillStore from '../stores/useSkillStore';
import useProgressStore from '../stores/useProgressStore';
import useStreakStore from '../stores/useStreakStore';
import SkillCard from '../components/SkillCard';
import DailyChallenge from '../components/DailyChallenge';
import Leaderboard from '../components/Leaderboard';

function StreakDisplay({ currentStreak, longestStreak }) {
  return (
    <div className="glass-card px-5 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔥</span>
        <div>
          <p className="text-xs text-white/40 font-body">Current Streak</p>
          <p className="font-display text-lg font-bold text-white/90">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="h-8 w-px bg-white/[0.06]" />
      <div>
        <p className="text-xs text-white/40 font-body">Best</p>
        <p className="font-display text-base font-semibold text-blood">{longestStreak} day{longestStreak !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}

export default function Home({ user }) {
  const { skills, loading, error, fetchSkills } = useSkillStore();
  const { progress, fetchProgress } = useProgressStore();
  const { currentStreak, longestStreak, markActive } = useStreakStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  useEffect(() => {
    fetchSkills().catch(() => {});
  }, [fetchSkills]);

  useEffect(() => {
    if (user) {
      fetchProgress(user.uid);
      markActive();
    }
  }, [user, fetchProgress, markActive]);

  const filteredSkills = useMemo(() => {
    let list = skills;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.topic?.toLowerCase().includes(q)
      );
    }
    if (filterDifficulty !== 'all') {
      list = list.filter((s) => s.difficulty === filterDifficulty);
    }
    return list;
  }, [skills, searchQuery, filterDifficulty]);

  const totalCorrect = useMemo(
    () => Object.values(progress).reduce((sum, s) => sum + (s.totalCorrect || 0), 0),
    [progress]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Gothic Filigree Border */}
      <div className="filigree-top">
        <div className="corner-ornament corner-ornament-tl"></div>
        <div className="corner-ornament corner-ornament-tr"></div>
      </div>

      {/* Hero Section */}
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]">
          Sharpen Your<br />
          <span className="gradient-text-gold">Mind &amp; Focus</span>
        </h1>

        <div className="hero-title-rule">
          <span className="hero-title-rule-line"></span>
          <span className="hero-title-rule-diamond"></span>
          <span className="hero-title-rule-line"></span>
        </div>

        <div className="hero-badge">
          <div className="hero-badge-dot"></div>
          Interactive Cognitive Training
        </div>

        <p className="mt-6 text-base text-white/40 font-body max-w-lg mx-auto">
          Train your brain with interactive cognitive exercises designed to boost memory, focus, and mental agility.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="mb-8 mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-gold/10 bg-gold-dim">
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold text-parchment">18 <span className="text-gold">Skills</span></p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">Available to Train</p>
        </div>
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold text-parchment">180+ <span className="text-gold">Questions</span></p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">In the Question Bank</p>
        </div>
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold"><span className="gradient-text-gold">AI</span><span className="text-parchment">-Powered</span></p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">Adaptive Generation</p>
        </div>
      </div>

      {/* Stats + Streak row */}
      <div className="mb-6 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
        {user && (
          <StreakDisplay currentStreak={currentStreak} longestStreak={longestStreak} />
        )}
        {user && totalCorrect > 0 && (
          <div className="glass-card px-5 py-3 flex items-center gap-3">
            <span className="text-xl">⭐</span>
            <div>
              <p className="text-xs text-white/40 font-body">Total Correct</p>
              <p className="font-display text-lg font-bold text-white/90">{totalCorrect}</p>
            </div>
          </div>
        )}
      </div>

      {/* Daily Challenge */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <DailyChallenge userId={user?.uid} />
      </div>

      {/* Search / Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-neural w-full pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'easy', 'medium', 'hard'].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDifficulty(d)}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold font-display transition-all capitalize ${
                filterDifficulty === d
                  ? 'border-blood/30 bg-blood-muted text-blood'
                  : 'border-white/[0.06] bg-white/[0.03] text-white/40 hover:text-white/70'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 animate-fade-up rounded-xl border border-blood/20 bg-blood-muted px-5 py-4 text-sm text-blood" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-16 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <div className="spinner-neural" />
        </div>
      )}

      {/* Skill Grid */}
      {!loading && !error && (
        <div className="animate-fade-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          {skills.length === 0 ? (
            <div className="glass-card px-8 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
                <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-display text-lg font-semibold text-white/60">No skills available yet.</p>
              <p className="mt-1 text-sm text-white/30 font-body">
                Add skills via the Admin panel to get started.
              </p>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="glass-card px-8 py-12 text-center">
              <p className="font-display text-lg font-semibold text-white/60">No skills match your search.</p>
              <p className="mt-1 text-sm text-white/30 font-body">
                Try a different search term or filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSkills.map((skill, idx) => (
                <div
                  key={skill.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${0.25 + idx * 0.08}s`, animationFillMode: 'both' }}
                >
                  <SkillCard
                    skill={skill}
                    progress={progress[skill.id] || null}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Preview */}
      <div className="mt-16 animate-fade-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            Leaderboard
            <span className="ml-2 text-xs font-normal text-white/30 font-body">Top Players</span>
          </h2>
          <Link
            to="/leaderboard"
            className="group flex items-center gap-1.5 text-sm font-medium text-blood/70 transition-colors hover:text-blood font-body"
          >
            View All
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="glass-card p-5">
          <Leaderboard compact userId={user?.uid} />
        </div>
      </div>

      {/* CTA for unauthenticated users */}
      {!user && (
        <div className="mt-16 animate-fade-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
          <div className="gradient-border rounded-xl">
            <div className="rounded-xl bg-gradient-card p-8 text-center">
              <h2 className="font-display text-2xl font-bold text-white">
                Sign in to track your progress
              </h2>
              <p className="mt-2 text-sm text-white/50 font-body max-w-md mx-auto">
                Save your scores, compete on the leaderboard, and take on daily challenges.
              </p>
              <Link to="/auth" className="btn-primary mt-6 inline-block">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
