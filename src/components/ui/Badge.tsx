// ============================================================
// Badge — status / risk band indicator
// ============================================================

import { clsx } from 'clsx';
import type { RiskBand, CaseStatus, LabResultStatus } from '../../types';

export type BadgeVariant =
  | RiskBand
  | CaseStatus
  | LabResultStatus
  | 'suspected'
  | 'confirmed'
  | 'negative'
  | 'pending'
  | 'contained'
  | 'cleared'
  | 'info';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const VARIANT_MAP: Record<string, string> = {
  low:          'badge-low',
  moderate:     'badge-moderate',
  high:         'badge-high',
  critical:     'badge-critical',
  suspected:    'badge-suspected',
  confirmed:    'badge-confirmed',
  negative:     'badge-negative',
  pending:      'badge-pending',
  contained:    'badge-contained',
  cleared:      'badge-cleared',
  reported:     'badge-pending',
  triaged:      'badge-pending',
  vet_assigned: 'badge-pending',
  vet_assessed: 'badge-suspected',
  sample_collected:  'badge-suspected',
  sample_dispatched: 'badge-suspected',
  sample_received:   'badge-suspected',
  lab_processing:    'badge-pending',
  result_pending:    'badge-pending',
  result_negative:   'badge-negative',
  result_positive:   'badge-confirmed',
  closed:       'badge-cleared',
  info:         'badge-contained',
  positive:     'badge-confirmed',
  inconclusive: 'badge-moderate',
  processing:   'badge-pending',
};

const LABEL_MAP: Record<string, string> = {
  low:               'Low Risk',
  moderate:          'Moderate Risk',
  high:              'High Risk',
  critical:          'Critical',
  suspected:         'Suspected',
  confirmed:         'Confirmed',
  negative:          'Negative',
  pending:           'Pending',
  contained:         'Contained',
  cleared:           'Cleared',
  reported:          'Reported',
  triaged:           'Triaged',
  vet_assigned:      'Vet Assigned',
  vet_assessed:      'Vet Assessed',
  sample_collected:  'Sample Collected',
  sample_dispatched: 'Sample Dispatched',
  sample_received:   'Lab Received',
  lab_processing:    'Processing',
  result_pending:    'Result Pending',
  result_negative:   'Negative',
  result_positive:   'Positive',
  closed:            'Closed',
  info:              'Info',
  positive:          'Positive',
  inconclusive:      'Inconclusive',
  processing:        'Processing',
};

export function Badge({ variant, label, size = 'md', className }: BadgeProps) {
  const cls = VARIANT_MAP[variant] ?? 'badge-pending';
  const text = label ?? LABEL_MAP[variant] ?? variant;

  return (
    <span
      className={clsx(
        'badge',
        cls,
        size === 'sm' && 'text-[10px] px-1.5 py-0.5',
        className
      )}
    >
      {text}
    </span>
  );
}
