import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Filter, Eye, WifiOff, CheckCircle2, User, Layers } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { RiskScoreRing } from '../components/ui/RiskScoreRing';
import { SYNTHETIC_CASES } from '../data/seed';
import type { RiskBand, CaseRecord } from '../types';
import { getCases } from '../services/api';
import { getOfflineIncidents, type OfflineIncidentPayload } from '../services/offlineQueue';
import { useAuthStore } from '../store/authStore';

const SPECIES_EMOJI: Record<string, string> = {
  cattle: '🐄', buffalo: '🐃', goat: '🐐',
  sheep: '🐑', pig: '🐷', poultry: '🐔', equine: '🐴', other: '🐾',
};

export function CasesPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskBand | 'all'>('all');
  const [viewScope, setViewScope] = useState<'all' | 'my'>(
    currentUser?.role === 'farmer' ? 'my' : 'all'
  );
  const [onlineCases, setOnlineCases] = useState<CaseRecord[]>(SYNTHETIC_CASES);
  const [offlineCases, setOfflineCases] = useState<OfflineIncidentPayload[]>([]);

  // Load online cases from api.ts and offline queued cases from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;

    getCases()
      .then(cases => {
        if (!isMounted) return;
        if (cases && cases.length > 0) {
          setOnlineCases(cases);
        } else {
          setOnlineCases(SYNTHETIC_CASES);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn('Failed to load cases from getCases(), using fallback:', err);
        setOnlineCases(SYNTHETIC_CASES);
      });

    getOfflineIncidents()
      .then(offCases => {
        if (!isMounted) return;
        setOfflineCases(offCases);
      })
      .catch(console.warn);

    return () => {
      isMounted = false;
    };
  }, []);

  // Track online case IDs to prevent duplicate entries
  const onlineCaseIds = new Set(onlineCases.map(c => c.id));

  // Map pending offline incidents (exclude synced ones or ones already present in onlineCases)
  const pendingOfflineCases: Array<CaseRecord & { isOfflinePending?: boolean; localId?: string }> = offlineCases
    .filter(o => o.syncMetadata.syncStatus !== 'SYNCED' && !onlineCaseIds.has(o.canonicalCaseId))
    .map(o => ({
      id: o.canonicalCaseId,
      localId: o.localId,
      isOfflinePending: true,
      incidentReport: {
        id: o.localId,
        reportedBy: o.reportedByUserId,
        reporterRole: o.reporterRole,
        createdAt: o.createdAt,
        updatedAt: o.createdAt,
        species: o.primarySpecies,
        totalAnimals: o.totalAnimalsInHerd,
        affectedAnimals: o.affectedAnimalCount,
        deadAnimals: o.deadAnimalCount,
        symptomIds: o.symptomIds,
        onsetDate: o.onsetDate,
        durationDays: o.durationDays,
        location: o.location,
        isVaccinated: o.isVaccinated,
        vaccineNames: o.vaccineNames,
        status: 'reported' as const,
      },
      triageResult: {
        id: `ra-${o.canonicalCaseId}`,
        caseId: o.canonicalCaseId,
        incidentId: o.canonicalCaseId,
        riskScore: 72,
        riskBand: 'high' as const,
        factors: [],
        modelVersion: 'offline-preview',
        requiresVeterinaryAssessment: true,
        recommendation: 'Awaiting online synchronization and triage escalation.',
        disclaimer: 'Offline preliminary report.',
        isSynthetic: true,
        computedAt: o.createdAt,
      },
      timeline: [],
    }));

  // Combine pending offline cases + latest online surveillance cases
  const combinedCases: Array<CaseRecord & { isOfflinePending?: boolean; localId?: string }> = [
    ...pendingOfflineCases,
    ...onlineCases.map(c => ({ ...c, isOfflinePending: false })),
  ];

  const filtered = combinedCases.filter(c => {
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

    const matchScope =
      viewScope === 'all' ||
      (currentUser && c.incidentReport.reportedBy === currentUser.id) ||
      (currentUser?.role === 'farmer' && (c.incidentReport.reportedBy === 'u-farmer-01' || c.isOfflinePending));

    return matchSearch && matchRisk && matchScope;
  });

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            {viewScope === 'my' ? 'My Reported Incidents' : 'Surveillance Case Tracker'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {viewScope === 'my'
              ? 'Tracking your farm health reports & field triage updates'
              : 'All active and historic surveillance reports across district'}
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm shadow-xs"
          onClick={() => navigate('/report')}
        >
          + Report Incident
        </button>
      </div>

      {/* Scope Switcher (All vs My Submissions) */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setViewScope('all')}
          className={`px-3 py-1.5 text-xs rounded-lg font-700 transition-all flex items-center gap-1.5 ${
            viewScope === 'all'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          <Layers size={14} /> All Surveillance Cases ({combinedCases.length})
        </button>

        <button
          onClick={() => setViewScope('my')}
          className={`px-3 py-1.5 text-xs rounded-lg font-700 transition-all flex items-center gap-1.5 ${
            viewScope === 'my'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          <User size={14} /> My Submissions ({
            combinedCases.filter(c => c.incidentReport.reportedBy === 'u-farmer-01' || c.isOfflinePending).length
          })
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
              {band === 'all' ? 'All Risks' : band.charAt(0).toUpperCase() + band.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm space-y-2">
            <p>No cases match your filter criteria.</p>
            {viewScope === 'my' && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => navigate('/report')}
              >
                File First Incident Report
              </button>
            )}
          </div>
        ) : (
          filtered.map(c => {
            const ir = c.incidentReport;
            const tr = c.triageResult;
            return (
              <div
                key={c.id}
                className="card p-4 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden"
                onClick={() => navigate(`/cases/${c.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/cases/${c.id}`)}
                aria-label={`Open case ${c.id}`}
              >
                {/* Left Colored Stripe for Offline Pending */}
                {c.isOfflinePending && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
                )}

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
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500 font-700">{c.id}</span>
                          {/* Sync Status Badge */}
                          {c.isOfflinePending ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-700 border border-amber-200">
                              <WifiOff size={10} /> Pending Sync
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-700 border border-emerald-200">
                              <CheckCircle2 size={10} /> Synced
                            </span>
                          )}
                        </div>

                        <h3 className="font-700 text-gray-900 flex items-center gap-1.5 mt-1">
                          {SPECIES_EMOJI[ir.species] || '🐾'} {ir.species.charAt(0).toUpperCase() + ir.species.slice(1)}
                          <span className="text-gray-400 font-400 text-sm">
                            · {ir.affectedAnimals}/{ir.totalAnimals} affected
                          </span>
                        </h3>

                        <p className="text-xs text-gray-500 mt-0.5">
                          {ir.location.village}, {ir.location.district} · {ir.location.state}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <Badge variant={ir.status} size="sm" />
                        {tr && <Badge variant={tr.riskBand} size="sm" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                      <span>Reported: {format(new Date(ir.createdAt), 'dd MMM yyyy, HH:mm')}</span>
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
