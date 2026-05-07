import { useState, useEffect, useCallback } from 'react';

function MultipleChoice({ question, answered, selected, onSelect }) {
  return (
    <div className="mt-6 space-y-3">
      {question.options.map((option, i) => {
        let stateClass = '';
        if (!answered) {
          stateClass = ' border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-blood/30 hover:bg-blood/[0.04] hover:text-white cursor-pointer';
        } else if (option === question.correctAnswer) {
          stateClass = ' border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
        } else if (option === selected) {
          stateClass = ' border-blood/40 bg-blood/10 text-blood';
        } else {
          stateClass = ' border-white/[0.04] bg-white/[0.01] text-white/20';
        }

        return (
          <button
            key={i}
            className={`w-full text-left rounded-xl border px-5 py-3.5 transition-all duration-200 text-sm font-body ${stateClass}`}
            onClick={() => onSelect(option)}
            disabled={answered}
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                !answered
                  ? 'bg-white/[0.06] text-white/40'
                  : option === question.correctAnswer
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : option === selected
                      ? 'bg-blood/20 text-blood'
                      : 'bg-white/[0.03] text-white/20'
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option}</span>
              {!answered && <span className="text-xs text-white/20 font-mono">({i + 1})</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TextInput({ question, answered, value, onChange, onSubmit }) {
  const [showHint, setShowHint] = useState(false);

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {!answered && question.hint && (
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="text-xs text-blood/60 hover:text-blood transition-colors font-body"
        >
          {showHint ? '− Hide hint' : '+ Show hint'}
        </button>
      )}
      {showHint && question.hint && (
        <div className="rounded-xl border border-blood/20 bg-blood/5 px-4 py-3 text-sm text-blood/80 font-body animate-fade-in">
          💡 {question.hint}
        </div>
      )}
      <input
        type="text"
        className="input-neural"
        placeholder="Type your answer..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={answered}
        autoFocus
      />
      {!answered && (
        <button
          type="submit"
          className="btn-primary"
          disabled={!value.trim()}
        >
          Submit Answer
        </button>
      )}
    </form>
  );
}

function PuzzleQuestion({ question, answered, onComplete }) {
  const [puzzleState, setPuzzleState] = useState(() => {
    if (question.puzzleType === 'sequence-order') {
      // Start with shuffled items
      const shuffled = [...(question.items || [])].sort(() => Math.random() - 0.5);
      return { ordered: shuffled };
    }
    if (question.puzzleType === 'match-pairs') {
      return { leftSelected: null, rightSelected: null, matches: [] };
    }
    if (question.puzzleType === 'fill-blank') {
      return { blanks: question.blanks ? question.blanks.map(() => '') : [] };
    }
    return {};
  });

  // Sequence Order
  if (question.puzzleType === 'sequence-order') {
    const moveItem = (from, to) => {
      if (answered) return;
      const items = [...puzzleState.ordered];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      setPuzzleState({ ordered: items });
    };

    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm text-white/40 font-body mb-2">Arrange in correct order:</p>
        {puzzleState.ordered.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-white/40 font-mono">
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-white/80 font-body">{item}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveItem(i, i - 1)}
                disabled={answered || i === 0}
                className="rounded-lg border border-white/[0.06] p-1.5 text-white/30 hover:text-white/60 disabled:opacity-20 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveItem(i, i + 1)}
                disabled={answered || i === puzzleState.ordered.length - 1}
                className="rounded-lg border border-white/[0.06] p-1.5 text-white/30 hover:text-white/60 disabled:opacity-20 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {!answered && (
          <button
            onClick={() => {
              const userAnswer = puzzleState.ordered.join(',');
              const correct = question.correctAnswer;
              onComplete(userAnswer, userAnswer.toLowerCase() === correct.toLowerCase());
            }}
            className="btn-primary mt-4"
          >
            Check Order
          </button>
        )}
      </div>
    );
  }

  // Fill-in-blank
  if (question.puzzleType === 'fill-blank') {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-white/40 font-body">{question.instruction || 'Fill in the blanks:'}</p>
        <div className="text-lg leading-relaxed text-white/80 font-body">
          {question.template?.split(/(\{blank\})/g).map((part, i) => {
            if (part === '{blank}') {
              const blankIdx = puzzleState.blanks.findIndex((b) => b === '');
              return (
                <input
                  key={i}
                  type="text"
                  className="mx-1 inline-block w-24 border-b-2 border-blood/40 bg-transparent text-center text-white outline-none transition-colors focus:border-blood"
                  value={puzzleState.blanks[i] || ''}
                  onChange={(e) => {
                    if (answered) return;
                    const blanks = [...puzzleState.blanks];
                    blanks[i] = e.target.value;
                    setPuzzleState({ blanks });
                  }}
                  disabled={answered}
                  autoFocus
                />
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        {!answered && (
          <button
            onClick={() => {
              const userAnswer = puzzleState.blanks.join(',').trim();
              onComplete(userAnswer, userAnswer.toLowerCase() === question.correctAnswer.toLowerCase());
            }}
            className="btn-primary mt-4"
            disabled={puzzleState.blanks.some((b) => !b.trim())}
          >
            Check Answer
          </button>
        )}
      </div>
    );
  }

  // Match pairs
  if (question.puzzleType === 'match-pairs') {
    const leftItems = question.leftItems || [];
    const rightItems = question.rightItems || [];

    const handleLeftSelect = (idx) => {
      if (answered) return;
      const next = { ...puzzleState, leftSelected: idx };
      if (idx !== null && puzzleState.rightSelected !== null) {
        next.matches = [...puzzleState.matches, { left: idx, right: puzzleState.rightSelected }];
        next.leftSelected = null;
        next.rightSelected = null;
      }
      setPuzzleState(next);
    };

    const handleRightSelect = (idx) => {
      if (answered) return;
      const matchedRight = puzzleState.matches.some((m) => m.right === idx);
      if (matchedRight) return;
      const next = { ...puzzleState, rightSelected: idx };
      if (idx !== null && puzzleState.leftSelected !== null) {
        next.matches = [...puzzleState.matches, { left: puzzleState.leftSelected, right: idx }];
        next.leftSelected = null;
        next.rightSelected = null;
      }
      setPuzzleState(next);
    };

    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-white/40 font-body">Match items from each column:</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {leftItems.map((item, i) => {
              const matched = puzzleState.matches.some((m) => m.left === i);
              const selected = puzzleState.leftSelected === i;
              return (
                <button
                  key={i}
                  onClick={() => handleLeftSelect(i)}
                  disabled={answered || matched}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-body transition-all ${
                    selected
                      ? 'border-blood/40 bg-blood/10 text-blood'
                      : matched
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/[0.06] bg-white/[0.03] text-white/60 hover:border-white/[0.12]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            {rightItems.map((item, i) => {
              const matched = puzzleState.matches.some((m) => m.right === i);
              const selected = puzzleState.rightSelected === i;
              return (
                <button
                  key={i}
                  onClick={() => handleRightSelect(i)}
                  disabled={answered || matched}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-body transition-all ${
                    selected
                      ? 'border-blood/40 bg-blood/10 text-blood'
                      : matched
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/[0.06] bg-white/[0.03] text-white/60 hover:border-white/[0.12]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
        {puzzleState.matches.length === leftItems.length && !answered && (
          <button
            onClick={() => {
              const userPairs = puzzleState.matches
                .sort((a, b) => a.left - b.left)
                .map((m) => `${leftItems[m.left]}:${rightItems[m.right]}`)
                .join('|');
              onComplete(userPairs, userPairs.toLowerCase() === question.correctAnswer.toLowerCase());
            }}
            className="btn-primary mt-2"
          >
            Check Matches
          </button>
        )}
      </div>
    );
  }

  return null;
}

function HoverReveal({ question, answered, onComplete }) {
  const [revealed, setRevealed] = useState([]);
  const [typedAnswer, setTypedAnswer] = useState('');

  const toggleReveal = (idx) => {
    if (answered) return;
    setRevealed((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-white/40 font-body">Hover or tap clues to reveal information:</p>
      <div className="flex flex-wrap gap-3">
        {(question.clues || []).map((clue, i) => (
          <div
            key={i}
            className="relative group"
            onMouseEnter={() => toggleReveal(i)}
            onMouseLeave={() => {
              if (!answered) setRevealed((prev) => prev.filter((idx) => idx !== i));
            }}
          >
            <div
              className={`rounded-xl border px-5 py-3 text-sm font-body transition-all duration-300 ${
                revealed.includes(i)
                  ? 'border-blood/30 bg-blood/10 text-blood shadow-glow-sm'
                  : 'border-white/[0.08] bg-white/[0.03] text-white/30 cursor-pointer hover:border-white/[0.15]'
              }`}
            >
              {revealed.includes(i) ? (
                <span className="animate-fade-in">{clue.content}</span>
              ) : (
                <span>{clue.label || `Clue ${i + 1}`}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {!answered && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!typedAnswer.trim()) return;
            onComplete(typedAnswer, typedAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase());
          }}
          className="space-y-3 mt-4"
        >
          <input
            type="text"
            className="input-neural"
            placeholder="Your answer based on clues..."
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={!typedAnswer.trim()}>
            Submit Answer
          </button>
        </form>
      )}
    </div>
  );
}

export default function QuestionCard({ question, onAnswer, onNext }) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');

  useEffect(() => {
    setSelected(null);
    setAnswered(false);
    setTextValue('');
    setIsCorrect(false);
    setUserAnswer('');
  }, [question?.questionText]);

  // Keyboard shortcuts
  useEffect(() => {
    if (answered || !question) return;
    const handler = (e) => {
      // Don't intercept keys when user is typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key >= '1' && e.key <= '4' && question.options) {
        const idx = parseInt(e.key) - 1;
        if (idx < question.options.length) {
          handleSelect(question.options[idx]);
        }
      }
      if (e.key === 'Enter' && question.interactionType === 'text-input' && textValue.trim() && !answered) {
        handleTextSubmit(e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [answered, question, textValue]);

  if (!question) {
    return (
      <div className="glass-card px-8 py-12 text-center">
        <p className="font-display text-lg font-semibold text-white/60">No questions available for this skill.</p>
      </div>
    );
  }

  const handleSelect = (option) => {
    if (answered) return;
    setSelected(option);
    setUserAnswer(option);
    const correct = option === question.correctAnswer;
    setIsCorrect(correct);
    setAnswered(true);
    onAnswer(correct, option);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (answered || !textValue.trim()) return;
    setUserAnswer(textValue.trim());
    const correct = textValue.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    setIsCorrect(correct);
    setAnswered(true);
    onAnswer(correct, textValue.trim());
  };

  const handlePuzzleComplete = (answer, correct) => {
    if (answered) return;
    setUserAnswer(answer);
    setIsCorrect(correct);
    setAnswered(true);
    onAnswer(correct, answer);
  };

  const handleNext = () => {
    setSelected(null);
    setAnswered(false);
    setTextValue('');
    setIsCorrect(false);
    setUserAnswer('');
    onNext();
  };

  const interactionType = question.interactionType || 'multiple-choice';

  return (
    <div className="glass-card p-6 sm:p-8">
      {/* Question header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs text-white/30 font-body">
          {interactionType === 'multiple-choice' && 'Multiple Choice'}
          {interactionType === 'text-input' && 'Type Answer'}
          {interactionType === 'puzzle' && 'Puzzle'}
          {interactionType === 'hover-reveal' && 'Investigate'}
        </span>
        {question.topic && (
          <span className="rounded-full border border-blood/[0.12] bg-blood/[0.06] px-3 py-1 text-xs text-blood/60 font-body capitalize">
            {question.topic.replace(/-/g, ' ')}
          </span>
        )}
      </div>

      {/* Question text */}
      <p className="mt-2 font-display text-xl font-semibold leading-snug text-white/90">
        {question.questionText}
      </p>

      {/* Interaction area */}
      {interactionType === 'multiple-choice' && (
        <MultipleChoice
          question={question}
          answered={answered}
          selected={selected}
          onSelect={handleSelect}
        />
      )}

      {interactionType === 'text-input' && (
        <TextInput
          question={question}
          answered={answered}
          value={textValue}
          onChange={setTextValue}
          onSubmit={handleTextSubmit}
        />
      )}

      {interactionType === 'puzzle' && (
        <PuzzleQuestion
          question={question}
          answered={answered}
          onComplete={handlePuzzleComplete}
        />
      )}

      {interactionType === 'hover-reveal' && (
        <HoverReveal
          question={question}
          answered={answered}
          onComplete={(answer, correct) => {
            setUserAnswer(answer);
            setIsCorrect(correct);
            setAnswered(true);
            onAnswer(correct, answer);
          }}
        />
      )}

      {/* Feedback */}
      {answered && (
        <div className="mt-6 animate-slide-up space-y-4">
          <div className={`rounded-xl border px-5 py-4 text-sm font-medium font-body ${
            isCorrect
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-blood/20 bg-blood/10 text-blood'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{isCorrect ? '✓' : '✗'}</span>
              <span>
                {isCorrect ? (
                  'Correct!'
                ) : (
                  <>
                    Not quite! The correct answer is{' '}
                    <span className="font-bold text-white/80">{question.correctAnswer}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Learning explanation */}
          {question.explanation && (
            <div className="rounded-xl border border-blood/15 bg-gradient-to-r from-blood/[0.04] to-transparent px-5 py-4 font-body">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-blood/60 text-sm">💡</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blood/50 mb-1">Learn</p>
                  <p className="text-sm leading-relaxed text-white/70">{question.explanation}</p>
                </div>
              </div>
            </div>
          )}

          <button onClick={handleNext} className="btn-primary w-full">
            Next Question →
          </button>
        </div>
      )}
    </div>
  );
}
