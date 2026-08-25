// ============================================================
// AlertBanner — info / warning / danger / success / critical
// ============================================================

import { clsx } from 'clsx';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Siren } from 'lucide-react';
import type { NotificationSeverity } from '../../types';

interface AlertBannerProps {
  severity: NotificationSeverity;
  title: string;
  message?: string;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

const SEVERITY_CONFIG = {
  info:     { cls: 'info',    Icon: Info,          iconCls: 'text-blue-500'   },
  warning:  { cls: 'warning', Icon: AlertTriangle,  iconCls: 'text-amber-500'  },
  danger:   { cls: 'danger',  Icon: AlertCircle,    iconCls: 'text-red-500'    },
  success:  { cls: 'success', Icon: CheckCircle,    iconCls: 'text-green-600'  },
  critical: { cls: 'critical',Icon: Siren,          iconCls: 'text-red-300'    },
};

export function AlertBanner({ severity, title, message, onDismiss, className, compact }: AlertBannerProps) {
  const { cls, Icon, iconCls } = SEVERITY_CONFIG[severity];

  return (
    <div className={clsx('alert-banner', cls, className)}>
      <Icon size={compact ? 16 : 18} className={clsx('flex-shrink-0 mt-0.5', iconCls)} />
      <div className="flex-1 min-w-0">
        <p className={clsx('font-semibold', compact ? 'text-xs' : 'text-sm')}>{title}</p>
        {message && !compact && (
          <p className="text-xs mt-0.5 opacity-90">{message}</p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-2"
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}
