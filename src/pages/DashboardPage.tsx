// ============================================================
// DashboardPage — Government Officer / Admin / Vet view
// ============================================================

import {
  AlertTriangle, Activity, FlaskConical, Map,
  TrendingUp, Database
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays } from 'date-fns';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { AlertBanner } from '../components/ui/AlertBanner';
import { SYNTHETIC_DASHBOARD_STATS, SYNTHETIC_CASES } from '../data/seed';

const stats = SYNTHETIC_DASHBOARD_STATS;

// Build 7-day chart data
const TREND_DATA = stats.casesLast7Days.map((count, i) => ({
  day: format(subDays(new Date('2026-08-25'), 6 - i), 'dd MMM'),
  cases: count,
}));

const SPECIES_COLORS: Record<string, string> = {
  cattle:  '#15803d',
  buffalo: '#0284c7',
  goat:    '#d97706',
  sheep:   '#7c3aed',
  pig:     '#dc2626',
};

const RISK_BAND_COLORS: Record<string, string> = {
  high:     '#dc2626',
  moderate: '#d97706',
  low:      '#16a34a',
};

export function DashboardPage() {

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <Activity size={20} className="text-green-600" />
            District Overview
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Nashik District · Maharashtra ·{' '}
            <span className="synthetic-watermark">Synthetic Data</span>
          </p>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          Last updated: {format(new Date(), 'dd MMM yyyy, HH:mm')}
        </div>
      </div>

      {/* Critical alert banner */}
      <AlertBanner
        severity="critical"
        title="OUTBREAK ALERT — FMD Serotype O Confirmed · Chandori, Nashik"
        message="Containment actions initiated. Ring vaccination and movement restriction in progress."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Cases"
          value={stats.totalActiveCases}
          icon={Activity}
          change="+3 since yesterday"
          changeDirection="up"
          accentColor="#15803d"
          isSynthetic
        />
        <StatCard
          label="High Risk Cases"
          value={stats.highRiskCases}
          icon={AlertTriangle}
          change="+1 today"
          changeDirection="up"
          accentColor="#dc2626"
          isSynthetic
        />
        <StatCard
          label="Lab Pending"
          value={stats.labPendingResults}
          icon={FlaskConical}
          change="4 dispatched today"
          changeDirection="neutral"
          accentColor="#d97706"
          isSynthetic
        />
        <StatCard
          label="Confirmed Outbreaks"
          value={stats.confirmedOutbreaks}
          icon={Map}
          change="1 new this week"
          changeDirection="up"
          accentColor="#7c3aed"
          isSynthetic
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Case trend line chart */}
        <div className="card p-4 lg:col-span-2">
          <div className="section-header mb-0">
            <h2 className="section-title text-sm">
              <TrendingUp size={15} className="text-green-600" />
              Case Trend (7 Days)
            </h2>
            <span className="synthetic-watermark">Synthetic</span>
          </div>
          <div className="mt-4" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
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

        {/* Species breakdown pie */}
        <div className="card p-4">
          <div className="section-header mb-0">
            <h2 className="section-title text-sm">
              <Database size={15} className="text-blue-600" />
              Species Breakdown
            </h2>
          </div>
          <div className="mt-4" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.speciesBreakdown}
                  dataKey="count"
                  nameKey="species"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {stats.speciesBreakdown.map(entry => (
                    <Cell
                      key={entry.species}
                      fill={SPECIES_COLORS[entry.species] ?? '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} cases`, String(name)]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={val => val.charAt(0).toUpperCase() + val.slice(1)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* District hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="section-title text-sm mb-4">
            <Map size={15} className="text-red-500" />
            District Risk Hotspots
          </h2>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.districtHotspots} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis dataKey="district" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} width={90} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.districtHotspots.map(entry => (
                    <Cell key={entry.district} fill={RISK_BAND_COLORS[entry.riskBand]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent cases table */}
        <div className="card p-4">
          <h2 className="section-title text-sm mb-4">
            <Activity size={15} className="text-green-600" />
            Recent Cases
          </h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Species</th>
                  <th>Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {SYNTHETIC_CASES.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs text-gray-600">{c.id}</td>
                    <td className="capitalize text-sm">{c.incidentReport.species}</td>
                    <td>
                      {c.triageResult && (
                        <Badge variant={c.triageResult.riskBand} size="sm" />
                      )}
                    </td>
                    <td>
                      <Badge variant={c.incidentReport.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Integration adapter notice */}
      <div className="card-elevated p-4 border-l-4 border-blue-400">
        <p className="text-xs text-blue-800 font-600 mb-1">Integration-Ready Architecture</p>
        <p className="text-xs text-blue-700">
          This system is designed to feed into or receive data from NADRES, INAPH, e-GOPALA, and WAHIS via API adapters.
          It does <strong>not</strong> replace those systems.
        </p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {['NADRES', 'INAPH', 'e-GOPALA', 'WAHIS'].map(sys => (
            <span key={sys} className="chip text-blue-700 bg-blue-50 border-blue-200">
              {sys} ↔ Adapter (Stub)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
