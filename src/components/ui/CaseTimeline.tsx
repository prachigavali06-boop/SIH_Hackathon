// ============================================================
// CaseTimeline — ordered event log for a case record
// ============================================================

import { CheckCircle, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { TimelineEvent } from '../../types';

interface CaseTimelineProps {
  events: TimelineEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  incident_reported:   'Incident Reported',
  triage_completed:    'AI Triage Completed',
  vet_assigned:        'Veterinarian Assigned',
  vet_assessed:        'Veterinary Assessment',
  field_visit:         'Field Investigation & Visit',
  sample_collected:    'Sample Collected',
  sample_dispatched:   'Sample Dispatched to Lab',
  sample_received:     'Sample Received at Lab',
  lab_result:          'Lab Result Entered',
  vaccination_updated: 'Vaccination Recorded',
  treatment_added:     'Treatment Prescribed',
  escalated:           'Operational Priority Escalation',
  containment_ordered: 'Containment Action Ordered',
  case_closed:         'Case Closed & Contained',
};

export function CaseTimeline({ events }: CaseTimelineProps) {
  return (
    <div className="space-y-2">
      {events.map((event, idx) => {
        const isLast   = idx === events.length - 1;
        const isFuture = false; // all events are past in current demo

        return (
          <div key={event.id} className="timeline-step pb-2">
            {/* Connector line */}
            {!isLast && (
              <div
                className="absolute left-[15px] w-0.5 bg-gray-200"
                style={{ top: 32, bottom: -8 }}
              />
            )}

            {/* Dot */}
            <div className={`timeline-dot ${isFuture ? 'pending' : isLast ? 'active' : 'done'}`}>
              {isFuture
                ? <Circle size={12} />
                : isLast
                  ? <Clock size={12} />
                  : <CheckCircle size={12} />
              }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-600 text-gray-800 leading-snug">
                  {EVENT_LABELS[event.eventType] ?? event.eventType}
                </p>
                <span className="text-xs text-gray-400 flex-shrink-0 font-mono">
                  {format(new Date(event.timestamp), 'dd MMM, HH:mm')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.summary}</p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {event.actorRole.replace('_', ' ')} {event.actorId === 'system' ? '(System)' : ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
