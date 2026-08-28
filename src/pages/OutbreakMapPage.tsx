// ============================================================
// OutbreakMapPage — Member 5: GIS Spatio-Temporal Outbreak Radar
// Full-Screen GIS Experience powered by OutbreakRadar Engine
// ============================================================

import { useState, useMemo } from 'react';
import { Map as MapIcon, ShieldAlert } from 'lucide-react';
import { OutbreakRadar } from '../components/dashboard/OutbreakRadar';
import { SurveillanceFilterBar, type FilterState } from '../components/dashboard/SurveillanceFilterBar';
import { HighRiskExplainabilityPanel } from '../components/dashboard/HighRiskExplainabilityPanel';
import { SYNTHETIC_MAP_CASES, SYNTHETIC_CLUSTERS } from '../data/seed';
import type { OutbreakCluster } from '../types';

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

export function OutbreakMapPage() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedCluster, setSelectedCluster] = useState<OutbreakCluster | null>(SYNTHETIC_CLUSTERS[0]);
  const [showExplainability, setShowExplainability] = useState<boolean>(true);

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const filteredMapCases = useMemo(() => {
    return SYNTHETIC_MAP_CASES.filter(c => {
      if (filters.state !== 'all' && c.state !== filters.state) return false;
      if (filters.district !== 'all' && c.district !== filters.district) return false;
      if (filters.block !== 'all' && c.block !== filters.block) return false;
      if (filters.village !== 'all' && c.village !== filters.village) return false;
      if (filters.species !== 'all' && c.species !== filters.species) return false;
      if (filters.riskLevel !== 'all' && c.riskBand !== filters.riskLevel) return false;
      if (filters.status !== 'all' && c.status !== filters.status) return false;
      return true;
    });
  }, [filters]);

  const filteredClusters = useMemo(() => {
    return SYNTHETIC_CLUSTERS.filter(cl => {
      if (filters.state !== 'all' && cl.affectedState !== filters.state) return false;
      if (filters.district !== 'all' && cl.affectedDistrict !== filters.district) return false;
      if (filters.riskLevel !== 'all' && cl.riskLevel !== filters.riskLevel) return false;
      return true;
    });
  }, [filters]);

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl flex items-center gap-2">
            <MapIcon size={22} className="text-green-700" />
            Spatio-Temporal GIS Outbreak Radar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            DBSCAN Spatio-Temporal Radius Clustering · OpenStreetMap + Leaflet ·{' '}
            <span className="synthetic-watermark">Synthetic Surveillance GIS Data</span>
          </p>
        </div>

        <button
          onClick={() => setShowExplainability(s => !s)}
          className={`btn btn-sm ${showExplainability ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
        >
          <ShieldAlert size={14} />
          {showExplainability ? 'Hide Risk Explainability' : 'Show Risk Explainability'}
        </button>
      </div>

      {/* Hierarchical Filter Bar */}
      <SurveillanceFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Split View Map + Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className={showExplainability ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <OutbreakRadar
            cases={filteredMapCases}
            clusters={filteredClusters}
            selectedDistrict={filters.district}
            selectedVillage={filters.village}
            selectedRiskLevel={filters.riskLevel}
            onSelectCluster={setSelectedCluster}
          />
        </div>

        {showExplainability && (
          <div>
            <HighRiskExplainabilityPanel
              locationName={selectedCluster ? selectedCluster.clusterName : 'Chandori High-Risk Zone'}
              riskBand={selectedCluster ? selectedCluster.riskLevel : 'critical'}
              riskScore={selectedCluster ? (selectedCluster.riskScore ?? 88) : 88}
              isSynthetic
            />
          </div>
        )}
      </div>
    </div>
  );
}
