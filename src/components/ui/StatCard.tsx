// ============================================================
// StatCard — dashboard metric tile
// ============================================================

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  accentColor?: string;
  className?: string;
  isSynthetic?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeDirection = 'neutral',
  accentColor = '#15803d',
  className,
  isSynthetic,
}: StatCardProps) {
  return (
    <div className={clsx('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <Icon size={20} style={{ color: accentColor }} />
        </div>
        {isSynthetic && (
          <span className="synthetic-watermark">Synthetic</span>
        )}
      </div>

      <div className="mt-2">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>

      {change && (
        <div className={clsx(
          'text-xs font-semibold mt-1 flex items-center gap-1',
          changeDirection === 'up'   && 'stat-change-up',
          changeDirection === 'down' && 'stat-change-down',
          changeDirection === 'neutral' && 'text-gray-500',
        )}>
          {changeDirection === 'up' && '↑'}
          {changeDirection === 'down' && '↓'}
          {change}
        </div>
      )}
    </div>
  );
}
