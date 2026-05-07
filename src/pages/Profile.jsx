import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useProgressStore from '../stores/useProgressStore';
import useSkillStore from '../stores/useSkillStore';
import useStreakStore from '../stores/useStreakStore';
import useAchievementStore from '../stores/useAchievementStore';
import {
  db,
  doc,
  getDoc,
} from '../firebase';
import {
  validateUsernameFormat,
  checkUsernameAvailability,
  claimUsername,
  canChangeUsername,
} from '../utils/firestoreHelpers';

export default function Profile({ user }) {
  const { progress, totalCorrect } = useProgressStore();
  const { skills } = useSkillStore();
  const { currentStreak, longestStreak } = useStreakStore();
  const { achievements } = useAchievementStore();

  // Username state
  const [userData, setUserData] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameStatus, setNameStatus] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [changeInfo, setChangeInfo] = useState(null);

  const skillIds = Object.keys(progress);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) setUserData(snap.data());
    }).catch(() => {});
  }, [user?.uid]);

  const currentUsername = userData?.username || user?.displayName || null;

  const unlockedAchievements = useMemo(
    () => achievements.filter((a) => a.unlocked),
    [achievements]
  );

  const lockedAchievements = useMemo(
    () => achievements.filter((a) => !a.unlocked),
    [achievements]
  );

  const handleEditClick = () => {
    setEditingName(true);
    setNewUsername(currentUsername || '');
    setNameError('');
    setNameStatus('');
    const info = canChangeUsername(userData || {});
    setChangeInfo(info);
    if (!info.allowed) {
      setNameError(info.message);
    }
  };

  const handleUsernameChange = async (value) => {
    setNewUsername(value);
    setNameError('');
    setNameStatus('');

    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setNameError(formatError);
      return;
    }

    // Don't check availability for own current name
    if (value.toLowerCase() === (currentUsername || '').toLowerCase()) {
      setNameStatus('This is your current username.');
      return;
    }

    const result = await checkUsernameAvailability(value);
    if (!result.available) {
      setNameError(result.message);
    } else {
      setNameStatus('Username available');
    }
  };

  const handleSaveUsername = async () => {
    if (!user?.uid) return;
    setNameError('');

    const formatError = validateUsernameFormat(newUsername);
    if (formatError) {
      setNameError(formatError);
      return;
    }

    if (newUsername.toLowerCase() === (currentUsername || '').toLowerCase()) {
      setEditingName(false);
      return;
    }

    const avail = await checkUsernameAvailability(newUsername);
    if (!avail.available) {
      setNameError(avail.message);
      return;
    }

    const info = canChangeUsername(userData || {});
    if (!info.allowed) {
      setNameError(info.message);
      return;
    }

    setSavingName(true);
    const result = await claimUsername(user.uid, newUsername.trim());
    setSavingName(false);

    if (result.success) {
      // Refresh user data
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setUserData(snap.data());
      setEditingName(false);
    } else {
      setNameError(result.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back Link */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-white/40 transition-colors hover:text-blood font-body"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Gothic Filigree Border */}
      <div className="filigree-top animate-fade-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <div className="corner-ornament corner-ornament-tl"></div>
        <div className="corner-ornament corner-ornament-tr"></div>
      </div>

      {/* Hero Header */}
      <div className="profile-hero animate-fade-up" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
        <div className="avatar-frame">
          <div className="avatar-frame-inner">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="h-full w-full rounded-[21px] object-cover" />
            ) : (
              <span className="gradient-text font-display text-4xl">
                {(currentUsername || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {editingName ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <input
                type="text"
                className="input-neural w-48 text-center"
                value={newUsername}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="new_username"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleSaveUsername}
                disabled={!!nameError || savingName || newUsername === currentUsername}
                className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {savingName ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
            </div>
            {nameError && <p className="text-xs text-neon-coral font-body">{nameError}</p>}
            {nameStatus && <p className="text-xs text-emerald-400 font-body">{nameStatus}</p>}
            {changeInfo && changeInfo.allowed && (
              <p className="text-xs text-white/30 font-body">
                {changeInfo.remaining} of {changeInfo.limit} changes remaining (resets every 60 days)
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 justify-center">
            <h1 className="font-display text-3xl font-bold gradient-text-gold">
              {currentUsername || 'Set your username'}
            </h1>
            {currentUsername && (
              <button
                onClick={handleEditClick}
                className="text-xs text-white/30 hover:text-white/60 font-body transition-colors"
                title="Change username"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            )}
          </div>
        )}
        <p className="mt-1 text-sm text-white/30 font-body">{user?.email}</p>

        <div className="hero-title-rule">
          <span className="hero-title-rule-line"></span>
          <span className="hero-title-rule-diamond"></span>
          <span className="hero-title-rule-line"></span>
        </div>

        <div className="hero-badge">
          <div className="hero-badge-dot"></div>
          Cognitive Athlete
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mb-6 grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-gold/10 bg-gold-dim animate-fade-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold gradient-text">
            {totalCorrect}
          </p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">Correct</p>
        </div>
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold text-parchment">
            {skillIds.length}
          </p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">Skills</p>
        </div>
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold">
            <span className="text-gold">{currentStreak}</span>
          </p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">Day Streak</p>
        </div>
        <div className="bg-crimson-950/60 backdrop-blur-sm px-4 py-5 text-center">
          <p className="font-display text-2xl font-bold text-gold">
            {unlockedAchievements.length}<span className="text-lg text-white/20">/{achievements.length}</span>
          </p>
          <p className="mt-1 text-xs font-body text-white/35 uppercase tracking-wider">Achievements</p>
        </div>
      </div>

      {/* Streak Card */}
      <div className="glass-card mb-6 overflow-hidden animate-fade-up" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-base font-bold text-white/75">Training Streak</h2>
          <div className="hero-badge" style={{ padding: '3px 12px', fontSize: '10px' }}>
            <div className="hero-badge-dot"></div>
            Active
          </div>
        </div>
        <div className="streak-grid">
          <div className="streak-item">
            <div className="streak-label">Current</div>
            <div className="streak-value gradient-text-gold">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</div>
          </div>
          <div className="streak-divider"></div>
          <div className="streak-item">
            <div className="streak-label">Longest</div>
            <div className="streak-value" style={{ color: '#dc2626' }}>{longestStreak} day{longestStreak !== 1 ? 's' : ''}</div>
          </div>
          <div className="streak-divider"></div>
          <div className="streak-item right">
            <div className="streak-label">Unlocked</div>
            <div className="streak-value" style={{ color: '#F0EDE8' }}>{unlockedAchievements.length}/{achievements.length}</div>
          </div>
        </div>
      </div>

      {/* Achievements Card */}
      <div className="glass-card mb-6 overflow-hidden animate-fade-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-base font-bold text-white/75">Achievements</h2>
          <span className="text-xs font-body text-white/30">{unlockedAchievements.length}/{achievements.length}</span>
        </div>
        {achievements.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-white/30 font-body">No achievements yet. Keep training!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
            {unlockedAchievements.map((a) => (
              <div key={a.id} className="achievement-card unlocked">
                <span className="achievement-icon">{a.icon}</span>
                <p className="achievement-name">{a.name}</p>
                <p className="achievement-desc">{a.description}</p>
              </div>
            ))}
            {lockedAchievements.slice(0, 3).map((a) => (
              <div key={a.id} className="achievement-card locked">
                <span className="achievement-icon locked">🏆</span>
                <p className="achievement-name" style={{ color: 'rgba(240,237,232,0.4)' }}>{a.name}</p>
                <p className="achievement-desc">{a.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skill Progress Card */}
      <div className="glass-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.35s', animationFillMode: 'both', marginBottom: '48px' }}>
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-base font-bold text-white/75">Skill Progress</h2>
        </div>

        <div className="ornate-divider" style={{ padding: '12px 0 16px' }}>
          <span className="ornate-divider-symbol">◆ ◇ ◆</span>
        </div>

        {skillIds.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-white/30 font-body">
              No skills practiced yet.{' '}
              <Link to="/" className="text-blood hover:text-blood/80 font-medium">
                Start training
              </Link>
            </p>
          </div>
        ) : (
          <div>
            {skillIds.map((skillId, idx) => {
              const skill = skills.find((s) => s.id === skillId);
              const p = progress[skillId];
              const accuracy = p?.totalCorrect && p?.totalCorrect > 0
                ? Math.round((p.totalCorrect / Math.max(p.totalCorrect + (p.wrongQuestions?.length || 0), 1)) * 100)
                : 0;
              return (
                <div
                  key={skillId}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02]"
                  style={idx < skillIds.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.03)' } : {}}
                >
                  <div className="skill-icon-box">
                    {skill?.icon || '🧠'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-semibold text-white/75">
                        {skill?.name || skillId}
                      </span>
                      <span className="font-display text-base font-bold text-gold ml-4">
                        {p?.lastScore || 0}%
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-white/30 font-body mt-0.5">
                      <span>{p?.totalCorrect || 0} correct</span>
                      <span>{accuracy}% acc</span>
                      <span>{p?.sessions?.length || 0} sessions</span>
                    </div>
                    <div className="progress-gold mt-2">
                      <div className="progress-gold-fill" style={{ width: `${p?.lastScore || 0}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
