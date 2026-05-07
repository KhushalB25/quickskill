import { useEffect, useState } from 'react';

const COLORS = [
  '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#991b1b',
  '#fbbf24', '#f59e0b', '#fb923c', '#fdba74', '#34d399',
];

const SHAPES = ['circle', 'square', 'triangle'];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticle(id) {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const size = randomBetween(6, 12);
  const x = randomBetween(0, 100);
  const delay = randomBetween(0, 0.5);
  const duration = randomBetween(2, 4);
  const rotation = randomBetween(0, 360);

  return { id, color, shape, size, x, delay, duration, rotation };
}

export default function Confetti({ active = false, duration = 4000 }) {
  const [particles, setParticles] = useState([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;

    const p = Array.from({ length: 60 }, (_, i) => createParticle(i));
    setParticles(p);
    setShow(true);

    const timer = setTimeout(() => {
      setShow(false);
      setParticles([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [active, duration]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[90] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-fade-up"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? '4px' : '0',
            clipPath: p.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
            opacity: 0,
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}
