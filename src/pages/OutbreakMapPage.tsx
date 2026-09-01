// ============================================================
// OutbreakMapPage — Member 5: GIS Spatio-Temporal Outbreak Radar
// Full-Screen GIS Experience powered by OutbreakRadar Engine
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { Map as MapIcon, ShieldAlert, Flame } from 'lucide-react';
import { OutbreakRadar } from '../components/dashboard/OutbreakRadar';
import { SurveillanceFilterBar, type FilterState } from '../components/dashboard/SurveillanceFilterBar';
import { HighRiskExplainabilityPanel } from '../components/dashboard/HighRiskExplainabilityPanel';
import { SYNTHETIC_MAP_CASES, SYNTHETIC_CLUSTERS } from '../data/seed';
import { retrieveClusters } from '../services/api';
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
  const [clusters, setClusters] = useState<OutbreakCluster[]>(SYNTHETIC_CLUSTERS);
  const [selectedCluster, setSelectedCluster] = useState<OutbreakCluster | null>(SYNTHETIC_CLUSTERS[0]);
  const [showExplainability, setShowExplainability] = useState<boolean>(true);

  useEffect(() => {
    retrieveClusters('Nashik')
      .then(res => {
        if (res && res.length > 0) {
          setClusters(res);
          setSelectedCluster(res[0]);
        }
      })
      .catch(err => {
        console.warn('Error fetching dynamic clusters:', err);
      });
  }, []);

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
    return clusters.filter(cl => {
      if (filters.state !== 'all' && cl.affectedState !== filters.state) return false;
      if (filters.district !== 'all' && cl.affectedDistrict !== filters.district) return false;
      if (filters.riskLevel !== 'all' && cl.riskLevel !== filters.riskLevel) return false;
      return true;
    });
  }, [clusters, filters]);

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="section-header flex-wrap gap-3">
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

        <div className="flex items-center gap-2 flex-wrap">
          {filteredClusters.length > 0 && (
            <span className="badge badge-high flex items-center gap-1 font-600 text-xs">
              <Flame size={13} /> {filteredClusters.length} AI Cluster{filteredClusters.length !== 1 ? 's' : ''} Detected
            </span>
          )}
          <button
            onClick={() => setShowExplainability(s => !s)}
            className={`btn btn-sm ${showExplainability ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
          >
            <ShieldAlert size={14} />
            {showExplainability ? 'Hide Risk Explainability' : 'Show Risk Explainability'}
          </button>
        </div>
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

