// ============================================================
// SurveillanceOverview — 9 Key Performance Indicators Grid
// Member 5 — Main Command Center KPI Summary Panel
// ============================================================

import {
  AlertTriangle, Activity, MapPin,
  Syringe, FlaskConical, Clock, CheckCircle2, Flame
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import type { DashboardStats } from '../../types';

interface SurveillanceOverviewProps {
  stats: DashboardStats;
  filteredCount?: number;
}

export function SurveillanceOverview({ stats, filteredCount }: SurveillanceOverviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-700 uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Activity size={15} className="text-green-700" />
          Main Surveillance Metrics
        </h2>
        {filteredCount !== undefined && (
          <span className="text-xs font-500 text-gray-500">
            Showing metrics for <span className="font-700 text-green-800">{filteredCount}</span> matching records
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-3">
        {/* Metric 1: Active Suspected Cases */}
        <StatCard
          label="Active Suspected"
          value={stats.activeSuspectedCases}
          icon={Activity}
          change="+4 in 24h"
          changeDirection="up"
          accentColor="#d97706"
          isSynthetic
        />

        {/* Metric 2: Confirmed Cases */}
        <StatCard
          label="Confirmed Cases"
          value={stats.confirmedCases}
          icon={Flame}
          change="RT-PCR Validated"
          changeDirection="up"
          accentColor="#dc2626"
          isSynthetic
        />

        {/* Metric 3: Emerging Clusters */}
        <StatCard
          label="Emerging Clusters"
          value={stats.emergingClusters}
          icon={AlertTriangle}
          change="DBSCAN Spatio-temporal"
          changeDirection="neutral"
          accentColor="#7c3aed"
          isSynthetic
        />

        {/* Metric 4: High-Risk Villages */}
        <StatCard
          label="High-Risk Villages"
          value={stats.highRiskVillages}
          icon={MapPin}
          change="Score > 75%"
          changeDirection="up"
          accentColor="#b91c1c"
          isSynthetic
        />

        {/* Metric 5: Vaccination Coverage */}
        <StatCard
          label="Vaccination Coverage"
          value={`${stats.vaccinationCoverage}%`}
          icon={Syringe}
          change="Target: 80%"
          changeDirection={stats.vaccinationCoverage >= 70 ? 'up' : 'down'}
          accentColor="#0284c7"
          isSynthetic
        />

        {/* Metric 6: Pending Samples */}
        <StatCard
          label="Pending Samples"
          value={stats.pendingSamples}
          icon={FlaskConical}
          change="In Lab Transit"
          changeDirection="neutral"
          accentColor="#ea580c"
          isSynthetic
        />

        {/* Metric 7: Avg Reporting Time */}
        <StatCard
          label="Avg Reporting Time"
          value={`${stats.avgReportingTimeHours}h`}
          icon={Clock}
          change="Field → AI Triage"
          changeDirection="down"
          accentColor="#16a34a"
          isSynthetic
        />

        {/* Metric 8: Avg Response Time */}
        <StatCard
          label="Avg Response Time"
          value={`${stats.avgResponseTimeHours}h`}
          icon={Clock}
          change="Report → Vet Visit"
          changeDirection="down"
          accentColor="#059669"
          isSynthetic
        />

        {/* Metric 9: Resolved Cases */}
        <StatCard
          label="Resolved Cases"
          value={stats.resolvedCases}
          icon={CheckCircle2}
          change="Quarantine Completed"
          changeDirection="neutral"
          accentColor="#15803d"
          isSynthetic
        />
      </div>
    </div>
  );
}
