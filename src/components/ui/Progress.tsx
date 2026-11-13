import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  label: string;
  tone?: 'brand' | 'gold';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, tone = 'brand', className = '' }) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`progress-track ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className="progress-fill"
        style={{ '--p': `${pct}%`, background: tone === 'gold' ? 'var(--gold)' : undefined } as React.CSSProperties}
      />
    </div>
  );
};

interface RingProps {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  tone?: 'brand' | 'gold' | 'danger';
  children?: React.ReactNode;
  className?: string;
}

/** Circular progress. Decorative by default; give the parent the accessible label. */
export const Ring: React.FC<RingProps> = ({ value, size = 40, stroke = 4, tone = 'brand', children, className = '' }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`var(--${tone})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 500ms var(--ease-out), stroke 200ms ease' }}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
};
