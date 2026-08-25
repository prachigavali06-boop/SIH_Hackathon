// ============================================================
// CasesPage — case list with filters
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Filter, Eye } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { RiskScoreRing } from '../components/ui/RiskScoreRing';
import { SYNTHETIC_CASES } from '../data/seed';
import type { RiskBand } from '../types';

const SPECIES_EMOJI: Record<string, string> = {
  cattle: '🐄', buffalo: '🐃', goat: '🐐',
  sheep: '🐑', pig: '🐷', poultry: '🐔', equine: '🐴', other: '🐾',
};

export function CasesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskBand | 'all'>('all');

  const filtered = SYNTHETIC_CASES.filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.id.toLowerCase().includes(q) ||
      c.incidentReport.species.includes(q) ||
      c.incidentReport.location.village?.toLowerCase().includes(q) ||
      c.incidentReport.location.district.toLowerCase().includes(q);
    const matchRisk =
      riskFilter === 'all' ||
      c.triageResult?.riskBand === riskFilter;
    return matchSearch && matchRisk;
  });

  return (
    <div className="space-y-5 page-enter">
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">Case Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All reported incidents · <span className="synthetic-watermark">Synthetic Data</span>
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/report')}
        >
          + Report Incident
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by ID, species, village…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9"
            id="case-search"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          {(['all', 'high', 'moderate', 'low'] as const).map(band => (
            <button
              key={band}
              onClick={() => setRiskFilter(band)}
              className={`btn btn-sm ${riskFilter === band ? 'btn-primary' : 'btn-secondary'}`}
            >
              {band === 'all' ? 'All' : band.charAt(0).toUpperCase() + band.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">
            No cases match your filter.
          </div>
        ) : (
          filtered.map(c => {
            const ir = c.incidentReport;
            const tr = c.triageResult;
            return (
              <div
                key={c.id}
                className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/cases/${c.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/cases/${c.id}`)}
                aria-label={`Open case ${c.id}`}
              >
                <div className="flex items-start gap-4">
                  {/* Risk ring */}
                  {tr ? (
                    <RiskScoreRing score={tr.riskScore} riskBand={tr.riskBand} size="sm" />
                  ) : (
                    <div className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-300 text-xs">
                      N/A
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <span className="font-mono text-xs text-gray-400">{c.id}</span>
                        <h3 className="font-700 text-gray-800 flex items-center gap-1.5 mt-0.5">
                          {SPECIES_EMOJI[ir.species]} {ir.species.charAt(0).toUpperCase() + ir.species.slice(1)}
                          <span className="text-gray-400 font-400 text-sm">
                            · {ir.affectedAnimals}/{ir.totalAnimals} affected
                          </span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {ir.location.village}, {ir.location.district} · {ir.location.state}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge variant={ir.status} size="sm" />
                        {tr && <Badge variant={tr.riskBand} size="sm" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Reported: {format(new Date(ir.createdAt), 'dd MMM, HH:mm')}</span>
                      {tr?.suspectedDisease && tr.suspectedDisease !== 'unknown' && (
                        <span className="chip">Suspected: {tr.suspectedDisease}</span>
                      )}
                    </div>
                  </div>

                  <Eye size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
