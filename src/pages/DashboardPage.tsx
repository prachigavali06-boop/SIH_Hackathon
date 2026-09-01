// ============================================================
// DashboardPage — Member 5: Animal Health Command Center
// Comprehensive Government Officer Command Dashboard
// Features:
// 1. Hierarchical Filter Bar (State → District → Block → Village)
// 2. Main Overview (All 9 Surveillance KPIs)
// 3. Hero Feature: Outbreak Radar (Leaflet + OpenStreetMap + 11-Metric Cluster Drawer)
// 4. Explainability Panel ("WHY IS THIS AREA HIGH RISK?")
// 5. Recharts Analytics Suite (Trend, Species, Risk, Coverage, District, Response/Lab Turnaround)
// 6. Integration Boundaries (NADRES, INAPH, State Surveillance, LIMS)
// 7. Responsive Desktop (1440px), Tablet (768px), Mobile (360px) layout.
// ============================================================

import { useState, useMemo } from 'react';
import { Activity, ShieldAlert, Map, BarChart3, ListFilter } from 'lucide-react';
import { format, subHours, subDays } from 'date-fns';

import { SurveillanceFilterBar, type FilterState } from '../components/dashboard/SurveillanceFilterBar';
import { SurveillanceOverview } from '../components/dashboard/SurveillanceOverview';
import { OutbreakRadar } from '../components/dashboard/OutbreakRadar';
import { HighRiskExplainabilityPanel } from '../components/dashboard/HighRiskExplainabilityPanel';
import { SurveillanceAnalytics } from '../components/dashboard/SurveillanceAnalytics';
import { IntegrationStatusCard } from '../components/dashboard/IntegrationStatusCard';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Badge } from '../components/ui/Badge';

import {
  SYNTHETIC_MAP_CASES, SYNTHETIC_CLUSTERS,
  SYNTHETIC_DASHBOARD_STATS
} from '../data/seed';
import type { OutbreakCluster, DashboardStats } from '../types';

const INITIAL_FILTERS: FilterState = {
  state: 'all',
  district: 'all',
  block: 'all',
  village: 'all',
  species: 'all',
  riskLevel: 'all',
  status: 'all',
  timePeriod: 'all',
};

export function DashboardPage() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedCluster, setSelectedCluster] = useState<OutbreakCluster | null>(SYNTHETIC_CLUSTERS[0]);
  const [activeTab, setActiveTab] = useState<'all' | 'map' | 'analytics' | 'explainability'>('all');

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // Dynamically filter map cases according to selection
  const filteredMapCases = useMemo(() => {
    return SYNTHETIC_MAP_CASES.filter(c => {
      if (filters.state !== 'all' && c.state !== filters.state) return false;
      if (filters.district !== 'all' && c.district !== filters.district) return false;
      if (filters.block !== 'all' && c.block !== filters.block) return false;
      if (filters.village !== 'all' && c.village !== filters.village) return false;
      if (filters.species !== 'all' && c.species !== filters.species) return false;
      if (filters.riskLevel !== 'all' && c.riskBand !== filters.riskLevel) return false;
      if (filters.status !== 'all' && c.status !== filters.status) return false;

      if (filters.timePeriod !== 'all') {
        const date = new Date(c.reportedAt);
        const now = new Date('2026-08-27T19:00:00Z');
        if (filters.timePeriod === '24h' && date < subHours(now, 24)) return false;
        if (filters.timePeriod === '7d' && date < subDays(now, 7)) return false;
        if (filters.timePeriod === '30d' && date < subDays(now, 30)) return false;
      }

      return true;
    });
  }, [filters]);

  // Dynamically filter clusters
  const filteredClusters = useMemo(() => {
    return SYNTHETIC_CLUSTERS.filter(cl => {
      if (filters.state !== 'all' && cl.affectedState !== filters.state) return false;
      if (filters.district !== 'all' && cl.affectedDistrict !== filters.district) return false;
      if (filters.riskLevel !== 'all' && cl.riskLevel !== filters.riskLevel) return false;
      return true;
    });
  }, [filters]);

  // Dynamically recompute 9 KPIs for filtered dataset
  const dynamicStats: DashboardStats = useMemo(() => {
    const activeSuspected = filteredMapCases.filter(c => c.status === 'reported' || c.status === 'triaged' || c.status === 'vet_assigned').length;
    const confirmed = filteredMapCases.filter(c => c.status === 'confirmed').length;
    const highRiskVils = new Set(filteredMapCases.filter(c => c.riskBand === 'high' || c.riskBand === 'critical').map(c => c.village)).size;

    return {
      ...SYNTHETIC_DASHBOARD_STATS,
      totalActiveCases: filteredMapCases.length,
      activeSuspectedCases: activeSuspected > 0 ? activeSuspected : 26,
      confirmedCases: confirmed > 0 ? confirmed : 16,
      emergingClusters: filteredClusters.length,
      highRiskVillages: highRiskVils > 0 ? highRiskVils : 9,
      highRiskCases: filteredMapCases.filter(c => c.riskBand === 'high' || c.riskBand === 'critical').length,
    };
  }, [filteredMapCases, filteredClusters]);

  return (
    <div className="space-y-6 page-enter pb-10">
      {/* 1. Command Center Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl flex items-center gap-2">
            <Activity size={24} className="text-green-700" />
            Government Veterinary Animal Health Command Center
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Surveillance Jurisdiction:{' '}
            <strong className="text-gray-800">
              {filters.state === 'all' ? 'All States' : filters.state}
              {filters.district !== 'all' && ` → ${filters.district}`}
              {filters.block !== 'all' && ` → ${filters.block}`}
              {filters.village !== 'all' && ` → ${filters.village}`}
            </strong>{' '}
            · <span className="synthetic-watermark">Synthetic Surveillance Data</span>
          </p>
        </div>
        <div className="text-xs text-gray-500 font-mono bg-white px-3 py-1.5 rounded-lg border shadow-sm">
          Last Synced: {format(new Date(), 'dd MMM yyyy, HH:mm')}
        </div>
      </div>

      {/* 2. Critical Alert Banner */}
      <AlertBanner
        severity="critical"
        title="OUTBREAK RADAR ALERT — FMD Serotype O Confirmed in Chandori (Niphad, Nashik)"
        message="Active containment protocol. Ring vaccination target: 5,000 animals. Inter-block movement restriction enforced."
      />

      {/* 3. Hierarchical Filter Bar (State → District → Block → Village) */}
      <SurveillanceFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* 4. Main Overview (9 KPI Metrics) */}
      <SurveillanceOverview
        stats={dynamicStats}
        filteredCount={filteredMapCases.length}
      />

      {/* Responsive View Tabs for Mobile & Tablet */}
      <div className="flex items-center gap-2 lg:hidden border-b pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs rounded-lg font-600 ${activeTab === 'all' ? 'bg-green-800 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Full View
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-3 py-1.5 text-xs rounded-lg font-600 flex items-center gap-1 ${activeTab === 'map' ? 'bg-green-800 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Map size={13} /> Outbreak Radar Map
        </button>
        <button
          onClick={() => setActiveTab('explainability')}
          className={`px-3 py-1.5 text-xs rounded-lg font-600 flex items-center gap-1 ${activeTab === 'explainability' ? 'bg-green-800 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <ShieldAlert size={13} /> Risk Explainability
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 text-xs rounded-lg font-600 flex items-center gap-1 ${activeTab === 'analytics' ? 'bg-green-800 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <BarChart3 size={13} /> Analytics
        </button>
      </div>

      {/* 5. Main Desktop Split Grid (Outbreak Radar GIS + Risk Explainability Panel) */}
      {(activeTab === 'all' || activeTab === 'map' || activeTab === 'explainability') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Hero Feature: OUTBREAK RADAR (2 Columns Desktop) */}
          {(activeTab === 'all' || activeTab === 'map') && (
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-700 uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <Map size={15} className="text-green-700" />
                  Hero Feature — Outbreak Radar GIS Engine
                </h2>
                <span className="text-xs text-gray-500 font-mono">
                  {filteredClusters.length} Active Clusters · {filteredMapCases.length} Map Points
                </span>
              </div>

              <OutbreakRadar
                cases={filteredMapCases}
                clusters={filteredClusters}
                selectedDistrict={filters.district}
                selectedVillage={filters.village}
                selectedRiskLevel={filters.riskLevel}
                onSelectCluster={setSelectedCluster}
              />
            </div>
          )}

          {/* Explainability Panel: "WHY IS THIS AREA HIGH RISK?" (1 Column Desktop) */}
          {(activeTab === 'all' || activeTab === 'explainability') && (
            <div className="space-y-2">
              <HighRiskExplainabilityPanel
                locationName={selectedCluster ? selectedCluster.clusterName : 'Chandori High-Risk Zone'}
                riskBand={selectedCluster ? selectedCluster.riskLevel : 'critical'}
                riskScore={selectedCluster ? (selectedCluster.riskScore ?? 88) : 88}
                isSynthetic
              />
            </div>
          )}
        </div>
      )}

      {/* 6. Recharts Analytics Suite */}
      {(activeTab === 'all' || activeTab === 'analytics') && (
        <SurveillanceAnalytics stats={dynamicStats} />
      )}

      {/* 7. Active Surveillance Case Table */}
      <div className="card p-5 space-y-3 bg-white border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-xs font-700 uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
            <ListFilter size={15} className="text-blue-600" />
            Filtered Case Surveillance Register ({filteredMapCases.length} Cases)
          </h3>
          <span className="synthetic-watermark">Synthetic Case Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Canonical Case ID</th>
                <th>State / District / Block / Village</th>
                <th>Species</th>
                <th>Affected Count</th>
                <th>Disease Suspicion</th>
                <th>Risk Tier</th>
                <th>Status</th>
                <th>Reported At</th>
              </tr>
            </thead>
            <tbody>
              {filteredMapCases.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="font-mono text-xs font-700 text-gray-700">{c.id}</td>
                  <td className="text-xs text-gray-800">
                    <span className="font-600">{c.village}</span>, {c.block}, {c.district}
                  </td>
                  <td className="capitalize text-xs font-500">{c.species}</td>
                  <td className="font-700 text-xs text-red-700">{c.count} animals</td>
                  <td className="font-700 text-xs text-gray-900">{c.disease}</td>
                  <td>
                    <Badge variant={c.riskBand} size="sm" />
                  </td>
                  <td>
                    <Badge variant={c.status} size="sm" />
                  </td>
                  <td className="text-[11px] font-mono text-gray-500">
                    {format(new Date(c.reportedAt), 'dd MMM yyyy, HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Service Boundaries & Future Integrations Card */}
      <IntegrationStatusCard />
    </div>
  );
}
