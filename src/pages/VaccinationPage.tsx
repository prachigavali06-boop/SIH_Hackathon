// ============================================================
// VaccinationPage — Module 10: Vaccination Coverage Analytics
// Village/Block coverage vs 75% vulnerability threshold ·
// Ring vaccination progress · Species filter
// Member 6 — Laboratory, Alerts & Vaccination Analytics
// ============================================================

import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Filter, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { getVaccinationCoverage } from '../services/platform';
import type { VaccinationCoverage, AnimalSpecies } from '../types';
import { useLanguage } from '../i18n/useLanguage';

// Species options for filter pill
const SPECIES_OPTIONS: { value: AnimalSpecies | 'all'; label: string }[] = [
  { value: 'all', label: 'All Species' },
  { value: 'cattle', label: 'Cattle' },
  { value: 'buffalo', label: 'Buffalo' },
  { value: 'goat', label: 'Goat' },
  { value: 'sheep', label: 'Sheep' },
  { value: 'pig', label: 'Pig' },
  { value: 'poultry', label: 'Poultry' },
];

// Coverage bar color based on percentage
function coverageColor(pct: number): string {
  if (pct >= 85) return 'bg-green-500';
  if (pct >= 75) return 'bg-lime-500';
  if (pct >= 50) return 'bg-orange-400';
  return 'bg-red-500';
}

// Coverage band label
function coverageBand(pct: number): { label: string; cls: string } {
  if (pct >= 85) return { label: 'High', cls: 'text-green-700 bg-green-50 border-green-200' };
  if (pct >= 75) return { label: 'Adequate', cls: 'text-lime-700 bg-lime-50 border-lime-200' };
  if (pct >= 50) return { label: 'Partial', cls: 'text-orange-700 bg-orange-50 border-orange-200' };
  return { label: 'Critical Gap', cls: 'text-red-700 bg-red-50 border-red-200' };
}

export function VaccinationPage() {
  const { t } = useLanguage();
  const [allCoverage, setAllCoverage] = useState<VaccinationCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState<AnimalSpecies | 'all'>('all');
  const [showVulnerableOnly, setShowVulnerableOnly] = useState(false);

  // Load vaccination coverage on mount
  useEffect(() => {
    let mounted = true;
    getVaccinationCoverage({})
      .then(data => { if (mounted) setAllCoverage(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Apply filters
  const filtered = allCoverage.filter(v => {
    if (speciesFilter !== 'all' && v.species !== speciesFilter) return false;
    if (showVulnerableOnly && !v.isVulnerable) return false;
    return true;
  });

  // Summary stats
  const totalEligible = filtered.reduce((s, v) => s + v.eligibleAnimalCount, 0);
  const totalVaccinated = filtered.reduce((s, v) => s + v.vaccinatedAnimalCount, 0);
  const overallPct = totalEligible > 0 ? Math.round((totalVaccinated / totalEligible) * 100) : 0;
  const vulnerableCount = filtered.filter(v => v.isVulnerable).length;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <ShieldCheck size={22} className="text-emerald-700" />
            {t('vaccination.title', 'Vaccination Coverage & Vulnerability Map')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('vaccination.subtitle', 'Targeted ring vaccination tracking and vulnerable population mapping')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="synthetic-watermark">{t('common.syntheticData', 'Synthetic Data')}</span>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 font-600 uppercase tracking-wider">{t('vaccination.overallCoverage', 'Overall Coverage')}</p>
          <p className={`text-3xl font-800 mt-1 ${overallPct >= 75 ? 'text-green-600' : 'text-red-600'}`}>
            {overallPct}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalVaccinated.toLocaleString()} / {totalEligible.toLocaleString()} animals</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 font-600 uppercase tracking-wider">{t('vaccination.locationsTracked', 'Locations Tracked')}</p>
          <p className="text-3xl font-800 mt-1 text-gray-800">{filtered.length}</p>
          <p className="text-xs text-gray-400 mt-1">{t('vaccination.locationsTrackedSub', 'village/block records')}</p>
        </div>
        <div className="card p-4 text-center border-red-200 bg-red-50/30">
          <p className="text-xs text-red-600 font-600 uppercase tracking-wider">{t('vaccination.vulnerablePockets', 'Vulnerable Pockets')}</p>
          <p className="text-3xl font-800 mt-1 text-red-600">{vulnerableCount}</p>
          <p className="text-xs text-gray-400 mt-1">{t('vaccination.belowThreshold', 'below 75% threshold')}</p>
        </div>
        <div className="card p-4 text-center border-green-200 bg-green-50/30">
          <p className="text-xs text-green-700 font-600 uppercase tracking-wider">{t('vaccination.protectedLocations', 'Protected Locations')}</p>
          <p className="text-3xl font-800 mt-1 text-green-600">{filtered.length - vulnerableCount}</p>
          <p className="text-xs text-gray-400 mt-1">{t('vaccination.atOrAboveThreshold', 'at or above threshold')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={15} className="text-gray-400" />
        {SPECIES_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSpeciesFilter(opt.value as AnimalSpecies | 'all')}
            className={`px-3 py-1 text-xs rounded-full capitalize font-600 transition-all ${
              speciesFilter === opt.value
                ? 'bg-emerald-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => setShowVulnerableOnly(v => !v)}
          className={`px-3 py-1 text-xs rounded-full font-600 flex items-center gap-1 transition-all ${
            showVulnerableOnly
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <AlertTriangle size={12} /> {t('vaccination.vulnerableOnly', 'Vulnerable Only')}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Loading coverage data…
        </div>
      )}

      {/* Coverage Table */}
      {!loading && (
        <>
          {filtered.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">
              No vaccination coverage records match the current filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(v => {
                const pct = Math.round(v.coveragePercentage);
                const band = coverageBand(pct);
                const gap = v.eligibleAnimalCount - v.vaccinatedAnimalCount;
                return (
                  <div
                    key={v.id}
                    className={`card p-4 transition-all ${
                      v.isVulnerable ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-400'
                    }`}
                  >
                    {/* Row header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {v.isVulnerable ? (
                            <span className="flex items-center gap-1 text-xs font-700 text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              <AlertTriangle size={12} /> {t('vaccination.vulnerable', 'VULNERABLE')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-700 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              <ShieldCheck size={12} /> {t('vaccination.protected', 'Protected')}
                            </span>
                          )}
                          <span className={`text-xs font-600 px-2 py-0.5 rounded-full border ${band.cls}`}>
                            {band.label}
                          </span>
                          <span className="text-xs text-gray-500 capitalize font-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            {v.species}
                          </span>
                        </div>
                        <h3 className="font-700 text-gray-900 mt-1.5 text-sm">
                          {v.village ? `${v.village}, ` : ''}{v.block}
                          {v.district && <span className="font-400 text-gray-500"> · {v.district}</span>}
                        </h3>
                        {v.vaccineType && (
                          <p className="text-xs text-gray-400 mt-0.5">{t('vaccination.vaccineLabel', 'Vaccine')}: {v.vaccineType}</p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`text-2xl font-800 ${pct >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                          {pct}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {v.vaccinatedAnimalCount.toLocaleString()} / {v.eligibleAnimalCount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Coverage progress bar */}
                    <div className="space-y-1.5">
                      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                        {/* Coverage bar */}
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all ${coverageColor(pct)}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                        {/* Threshold line at 75% */}
                        <div
                          className="absolute top-0 h-full w-0.5 bg-gray-600 opacity-60"
                          style={{ left: `${v.riskThresholdPercentage ?? 75}%` }}
                          title={`Threshold: ${v.riskThresholdPercentage ?? 75}%`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>0%</span>
                        <span className="font-600 text-gray-500">
                          {t('vaccination.threshold', 'Threshold')}: {v.riskThresholdPercentage ?? 75}%
                        </span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Footer row */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap text-xs text-gray-500">
                      <span>
                        {v.isVulnerable ? (
                          <span className="flex items-center gap-1 text-red-600 font-600">
                            <TrendingDown size={13} />
                            Gap: {gap.toLocaleString()} animals unvaccinated
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600 font-600">
                            <TrendingUp size={13} />
                            {gap > 0 ? `${gap.toLocaleString()} ${t('vaccination.aboveThreshold', 'animals above threshold')}` : t('vaccination.fullyVaccinated', 'Fully vaccinated')}
                          </span>
                        )}
                      </span>
                      <span className="text-gray-400">
                        {t('vaccination.campaign', 'Campaign')}: {v.campaignDate
                          ? format(new Date(v.campaignDate), 'dd MMM yyyy')
                          : '—'}
                      </span>
                      {v.source && (
                        <span className="text-gray-300">{t('vaccination.source', 'Source')}: {v.source}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Threshold legend note */}
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
            <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-gray-700">Vulnerability Threshold:</strong> Locations with vaccination
              coverage below <strong>{75}%</strong> are flagged as vulnerable and require priority ring vaccination
              targeting. The vertical marker on each bar indicates the configured threshold.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
