import { Link } from 'react-router-dom';

const typeIcons = {
  cognitive: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6 6 0 006-6m-6 6a6 6 0 01-6-6m6 6v5.25M12 6V4.5m0 0a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5z" />
    </svg>
  ),
  vocabulary: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  memory: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
};

export default function SkillCard({ skill, progress }) {
  const type = skill.type || 'cognitive';
  const icon = typeIcons[type] || typeIcons.cognitive;
  const accentBorder = type === 'vocabulary' ? 'border-l-gold/20' : 'border-l-blood/20';

  return (
    <Link
      to={`/training/${skill.id}`}
      className="group glass-card flex flex-col p-5 transition-all duration-300 hover:shadow-card-hover border-l-[3px] border-l-transparent hover:border-l-blood/30"
    >
      {/* Top badges */}
      <div className="mb-3 flex items-start justify-between">
        <span className={`badge-neural type-${type} capitalize inline-flex items-center gap-1.5`}>
          {icon}
          {type}
        </span>
        <span className={`badge-neural diff-${skill.difficulty} capitalize`}>{skill.difficulty}</span>
      </div>

      {/* Title */}
      <h3 className="font-display text-lg font-bold text-white/90 transition-colors group-hover:text-white">
        {skill.name}
      </h3>

      {/* Description */}
      <p className="mt-1 flex-1 text-sm leading-relaxed text-white/40 font-body line-clamp-2">
        {skill.description}
      </p>

      {/* Enhances */}
      {skill.enhances && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-white/30 font-body">
          <svg className="h-3.5 w-3.5 text-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {skill.enhances}
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between text-xs font-body">
            <span className="text-white/40">Correct: <span className="text-white/70 font-medium">{progress.totalCorrect || 0}</span></span>
            <span className="text-white/40">Score: <span className="text-gold font-medium">{progress.lastScore || 0}%</span></span>
          </div>
          <div className="progress-neural mt-2">
            <div className="progress-neural-fill" style={{ width: `${progress.lastScore || 0}%` }} />
          </div>
          {progress.lastPracticed && (
            <p className="mt-1.5 text-xs text-white/20 font-body">
              Last practiced: {new Date(progress.lastPracticed).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Hover indicator */}
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-gold/0 transition-all group-hover:text-gold font-body">
        Start Training
        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
