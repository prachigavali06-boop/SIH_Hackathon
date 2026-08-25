// ============================================================
// RiskScoreRing — visual risk score display
// ============================================================

import type { RiskBand } from '../../types';

interface RiskScoreRingProps {
  score: number;
  riskBand: RiskBand;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const RING_COLORS = {
  low:      { stroke: '#16a34a', text: '#15803d' },
  moderate: { stroke: '#d97706', text: '#92400e' },
  high:     { stroke: '#dc2626', text: '#991b1b' },
  critical: { stroke: '#7f1d1d', text: '#ef4444' },
};

const SIZES = {
  sm: { wh: 56,  r: 22, sw: 3,  fs: '0.8rem'  },
  md: { wh: 80,  r: 32, sw: 4,  fs: '1.1rem'  },
  lg: { wh: 112, r: 44, sw: 5,  fs: '1.5rem'  },
};

export function RiskScoreRing({ score, riskBand, size = 'md', showLabel }: RiskScoreRingProps) {
  const { wh, r, sw, fs } = SIZES[size];
  const { stroke, text } = RING_COLORS[riskBand];
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative flex items-center justify-center"
        style={{ width: wh, height: wh }}
        role="img"
        aria-label={`Risk score: ${score}% — ${riskBand}`}
      >
        {/* Background circle */}
        <svg
          width={wh}
          height={wh}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={wh / 2}
            cy={wh / 2}
            r={r}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={sw}
          />
          <circle
            cx={wh / 2}
            cy={wh / 2}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>

        {/* Center score */}
        <div
          className="relative z-10 flex flex-col items-center"
          style={{ color: text }}
        >
          <span style={{ fontSize: fs, fontWeight: 800, lineHeight: 1 }}>{score}</span>
          {size !== 'sm' && <span style={{ fontSize: '0.55rem', fontWeight: 600, opacity: 0.8 }}>%</span>}
        </div>
      </div>

      {showLabel && (
        <span
          className="text-xs font-700 uppercase tracking-wide"
          style={{ color: text }}
        >
          {riskBand} risk
        </span>
      )}
    </div>
  );
}
