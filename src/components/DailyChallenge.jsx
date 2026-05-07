import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyChallenge, hasCompletedDailyChallenge, getTodayDateStr } from '../utils/firestoreHelpers';
import useSkillStore from '../stores/useSkillStore';

export default function DailyChallenge({ userId }) {
  const [challenge, setChallenge] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { skills } = useSkillStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const today = getTodayDateStr();
        const [challengeData, completedData] = await Promise.all([
          getDailyChallenge(today),
          hasCompletedDailyChallenge(userId, today),
        ]);
        setChallenge(challengeData);
        setCompleted(completedData);
      } catch (err) {
        console.error('Failed to load daily challenge:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="h-6 w-48 rounded-lg bg-white/[0.04] animate-pulse" />
      </div>
    );
  }

  if (!challenge) return null;

  const skill = skills.find((s) => s.id === challenge.skillId);

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      completed
        ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
        : 'gradient-border bg-gradient-card'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            completed ? 'bg-emerald-500/15' : 'bg-gradient-blood/20'
          }`}>
            {completed ? (
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-blood" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className={`font-display text-base font-bold ${completed ? 'text-emerald-300' : 'text-white'}`}>
              {completed ? 'Daily Challenge Complete!' : 'Daily Challenge'}
            </h3>
            <p className="mt-0.5 text-sm text-white/40 font-body">
              {skill ? `Skill: ${skill.name}` : ''}
              {' • '}
              {challenge.requiredQuestions} questions
              {challenge.reward ? ` • Reward: ${challenge.reward}` : ''}
            </p>
          </div>
        </div>
        {!completed && (
          <button
            onClick={() => navigate(`/training/${challenge.skillId}`)}
            className="btn-primary shrink-0 text-xs"
          >
            Start Now
          </button>
        )}
      </div>
    </div>
  );
}
