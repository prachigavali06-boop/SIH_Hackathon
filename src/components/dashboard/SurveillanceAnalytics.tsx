// ============================================================
// SurveillanceAnalytics — Recharts Analytics Suite
// Member 5 — Command Center Analytics Component
// Includes:
// 1. Case Trend (Timeline)
// 2. Species Distribution (Pie/Donut)
// 3. Risk Level Distribution (Bar)
// 4. Vaccination Coverage vs Target per District (Bar + Reference Line)
// 5. District Comparison (Horizontal Bar)
// 6. Response Time & Lab Turnaround Breakdown (Stacked/Dual Bar)
// ============================================================

import {
  TrendingUp, Database, ShieldAlert, Map, Clock, FlaskConical
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts';
import { format, subDays } from 'date-fns';
import type { DashboardStats } from '../../types';

interface SurveillanceAnalyticsProps {
  stats: DashboardStats;
}

const SPECIES_COLORS: Record<string, string> = {
  cattle:  '#15803d',
  buffalo: '#0284c7',
  goat:    '#d97706',
  sheep:   '#7c3aed',
  pig:     '#dc2626',
  poultry: '#e11d48',
};

const RISK_BAND_COLORS: Record<string, string> = {
  critical: '#7c3aed',
  high:     '#dc2626',
  moderate: '#d97706',
  low:      '#16a34a',
};

export function SurveillanceAnalytics({ stats }: SurveillanceAnalyticsProps) {
  // Build 7-day trend data
  const trendData = stats.casesLast7Days.map((count, i) => ({
    day: format(subDays(new Date('2026-08-27'), 6 - i), 'dd MMM'),
    cases: count,
  }));

  // District comparison data
  const districtData = stats.districtComparison || [
    { district: 'Nashik', activeCases: 18, confirmedCases: 8, riskBand: 'critical', vaccinationCoverage: 52.4 },
    { district: 'Ahilyanagar', activeCases: 12, confirmedCases: 5, riskBand: 'high', vaccinationCoverage: 58.0 },
    { district: 'Pune', activeCases: 7, confirmedCases: 2, riskBand: 'moderate', vaccinationCoverage: 71.2 },
    { district: 'Kolhapur', activeCases: 5, confirmedCases: 1, riskBand: 'low', vaccinationCoverage: 84.5 },
  ];

  // Risk distribution data
  const riskData = stats.riskBreakdown || [
    { riskBand: 'critical', count: 6 },
    { riskBand: 'high', count: 11 },
    { riskBand: 'moderate', count: 17 },
    { riskBand: 'low', count: 8 },
  ];

  // Response time breakdown data
  const responseTimes = stats.responseTimeBreakdown || [
    { stage: 'AI Triage', hours: 0.5 },
    { stage: 'Vet Assignment', hours: 3.3 },
    { stage: 'Field Visit', hours: 12.4 },
    { stage: 'Sample Dispatch', hours: 4.5 },
  ];

  // Lab turnaround breakdown data
  const labTurnaround = stats.labTurnaroundBreakdown || [
    { stage: 'Sample Collection', hours: 2.1 },
    { stage: 'Cold Chain Transit', hours: 14.5 },
    { stage: 'Lab Intake', hours: 1.8 },
    { stage: 'RT-PCR & Entry', hours: 6.2 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-xs font-700 uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <TrendingUp size={15} className="text-green-700" />
          Surveillance Analytics & Epidemiological Intelligence
        </h2>
        <span className="synthetic-watermark">Recharts Visualization Suite</span>
      </div>

      {/* Row 1: Case Trend (7-day) & Species Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Case Trend Timeline */}
        <div className="card p-4 lg:col-span-2 bg-white">
          <div className="section-header mb-2">
            <h3 className="text-xs font-700 text-gray-800 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-green-600" />
              Epidemiological Case Trend (Past 7 Days)
            </h3>
            <span className="text-[11px] text-gray-500">Daily Reported Incidents</span>
          </div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Line
                  type="monotone"
                  dataKey="cases"
                  stroke="#15803d"
                  strokeWidth={2.5}
                  dot={{ fill: '#15803d', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Species Breakdown Pie */}
        <div className="card p-4 bg-white">
          <div className="section-header mb-2">
            <h3 className="text-xs font-700 text-gray-800 flex items-center gap-1.5">
              <Database size={14} className="text-blue-600" />
              Species Distribution
            </h3>
          </div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.speciesBreakdown}
                  dataKey="count"
                  nameKey="species"
                  cx="50%"
                  cy="50%"
                  outerRadius={68}
                  paddingAngle={2}
                >
                  {stats.speciesBreakdown.map(entry => (
                    <Cell
                      key={entry.species}
                      fill={SPECIES_COLORS[entry.species] ?? '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} cases`, String(name)]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} formatter={val => val.charAt(0).toUpperCase() + val.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Risk Distribution & District Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 3: Risk Level Distribution */}
        <div className="card p-4 bg-white">
          <h3 className="text-xs font-700 text-gray-800 mb-3 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-amber-500" />
            Risk Level Distribution (Cases by Severity Tier)
          </h3>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="riskBand" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val: string) => String(val).toUpperCase()} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskData.map(entry => (
                    <Cell key={entry.riskBand} fill={RISK_BAND_COLORS[entry.riskBand as keyof typeof RISK_BAND_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: District Comparison & Vaccination Coverage */}
        <div className="card p-4 bg-white">
          <h3 className="text-xs font-700 text-gray-800 mb-3 flex items-center gap-1.5">
            <Map size={14} className="text-purple-600" />
            District Active Cases vs Vaccination Coverage (%)
          </h3>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="district" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: 'Cases', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#0284c7' }} domain={[0, 100]} label={{ value: 'Coverage %', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="activeCases" name="Active Cases" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="vaccinationCoverage" name="Vaccination Coverage %" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <ReferenceLine yAxisId="right" y={80} label={{ value: '80% Target', fill: '#16a34a', fontSize: 10 }} stroke="#16a34a" strokeDasharray="3 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Response Time & Lab Turnaround Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 5: Response Time Stages */}
        <div className="card p-4 bg-white">
          <h3 className="text-xs font-700 text-gray-800 mb-3 flex items-center gap-1.5">
            <Clock size={14} className="text-green-600" />
            Average Officer Response Time Breakdown (Hours)
          </h3>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseTimes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: '#4b5563' }} width={140} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(val) => [`${val} hours`, 'Average Time']} />
                <Bar dataKey="hours" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Lab Turnaround Pipeline */}
        <div className="card p-4 bg-white">
          <h3 className="text-xs font-700 text-gray-800 mb-3 flex items-center gap-1.5">
            <FlaskConical size={14} className="text-amber-600" />
            Laboratory Diagnostic Turnaround Time (Hours)
          </h3>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={labTurnaround} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: '#4b5563' }} width={130} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(val) => [`${val} hours`, 'Lab Duration']} />
                <Bar dataKey="hours" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
