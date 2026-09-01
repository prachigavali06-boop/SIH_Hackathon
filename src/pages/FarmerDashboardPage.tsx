// ============================================================
// FarmerDashboardPage — Dedicated Farmer Health Dashboard
// Simple, accessible, farmer-first view of livestock health,
// active reports, early warnings, alerts, and offline sync.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText,
  AlertTriangle,
  Clock,
  Bell,
  PlusCircle,
  ChevronRight,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  HelpCircle,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { RiskScoreRing } from '../components/ui/RiskScoreRing';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { getCases } from '../services/api';
import {
  getOfflineIncidents,
  syncOfflineQueue,
  subscribeToSyncEvents,
  type OfflineIncidentPayload,
} from '../services/offlineQueue';
import { SYNTHETIC_CASES } from '../data/seed';
import type { CaseRecord } from '../types';

const SPECIES_EMOJI: Record<string, string> = {
  cattle: '🐄',
  buffalo: '🐃',
  goat: '🐐',
  sheep: '🐑',
  pig: '🐷',
  poultry: '🐔',
  equine: '🐴',
  other: '🐾',
};

export function FarmerDashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { notifications, unreadCount } = useNotificationStore();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [offlineIncidents, setOfflineIncidents] = useState<OfflineIncidentPayload[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch farmer cases and check offline queue
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // 1. Fetch live online cases
        const liveCases = await getCases().catch(() => SYNTHETIC_CASES);
        if (isMounted) {
          setCases(liveCases.length > 0 ? liveCases : SYNTHETIC_CASES);
        }

        // 2. Fetch offline stored incidents
        const offList = await getOfflineIncidents().catch(() => []);
        if (isMounted) {
          setOfflineIncidents(offList);
        }
      } catch (err) {
        console.warn('Error loading farmer dashboard data:', err);
        if (isMounted) {
          setCases(SYNTHETIC_CASES);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Subscribe to offline sync queue events
    const unsubscribe = subscribeToSyncEvents((count, online) => {
      if (isMounted) {
        setPendingSyncCount(count);
        setIsOnline(online);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Filter cases belonging to the current farmer
  // (matches currentUser.id or demo farmer u-farmer-01)
  const farmerId = currentUser?.id || 'u-farmer-01';

  const onlineCaseIds = new Set(cases.map(c => c.id));
  const pendingOfflineItems = offlineIncidents.filter(
    o => o.syncMetadata.syncStatus !== 'SYNCED' && !onlineCaseIds.has(o.canonicalCaseId)
  );

  const farmerOnlineCases = cases.filter(
    c =>
      c.incidentReport.reportedBy === farmerId ||
      c.incidentReport.reportedBy === 'u-farmer-01'
  );

  // Combined farmer cases (offline queued + online)
  const allFarmerCases: Array<CaseRecord & { isOfflinePending?: boolean }> = [
    ...pendingOfflineItems.map(o => ({
      id: o.canonicalCaseId,
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
        factors: [
          {
            factorName: 'Offline Field Triage',
            contribution: 30,
            evidence: 'Saved locally on phone',
            direction: 'risk' as const,
          },
        ],
        modelVersion: 'offline-preview',
        requiresVeterinaryAssessment: true,
        recommendation: 'Stored on device. Waiting to sync with veterinary network.',
        disclaimer: 'Early-warning preliminary report.',
        isSynthetic: true,
        computedAt: o.createdAt,
      },
      timeline: [],
    })),
    ...farmerOnlineCases.map(c => ({ ...c, isOfflinePending: false })),
  ];

  // KPI Calculations
  const activeReportsCount = allFarmerCases.filter(
    c => c.incidentReport.status !== 'closed'
  ).length;

  const highRiskCount = allFarmerCases.filter(
    c =>
      c.triageResult?.riskBand === 'high' ||
      c.triageResult?.riskBand === 'critical'
  ).length;

  const pendingReviewCount = allFarmerCases.filter(
    c =>
      c.incidentReport.status === 'reported' ||
      c.incidentReport.status === 'triaged' ||
      c.incidentReport.status === 'vet_assigned' ||
      c.incidentReport.status === 'sample_collected' ||
      c.incidentReport.status === 'sample_dispatched' ||
      c.incidentReport.status === 'lab_processing' ||
      c.incidentReport.status === 'result_pending'
  ).length;

  // Latest high-risk or most recent case for AI early-warning showcase
  const primaryCase =
    allFarmerCases.find(
      c =>
        c.triageResult?.riskBand === 'critical' ||
        c.triageResult?.riskBand === 'high'
    ) || allFarmerCases[0];

  // Handle manual offline sync button
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      const updatedLive = await getCases();
      setCases(updatedLive);
      const updatedOff = await getOfflineIncidents();
      setOfflineIncidents(updatedOff);
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Recent 4 notifications
  const recentAlerts = notifications.slice(0, 4);

  return (
    <div className="space-y-6 page-enter pb-10 max-w-6xl mx-auto">
      {/* ============================================================ */}
      {/* 1. FARMER HEADER                                            */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-6 translate-y-6 text-9xl select-none">
          🐄
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-900/40 px-3 py-1 rounded-full text-xs font-600 text-emerald-200 border border-emerald-500/30 mb-2">
              <span>🌾 Farmer Care Portal</span>
              {currentUser?.village && (
                <>
                  <span>•</span>
                  <span>{currentUser.village}, {currentUser.district}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-800 tracking-tight text-white">
              Welcome back, {currentUser?.name || 'Farmer'}!
            </h1>
            <p className="text-emerald-100 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Monitor your livestock health, track reported incidents, and stay informed about important alerts and veterinary visits.
            </p>
          </div>

          {/* Sync status chip & manual button */}
          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-700 border ${
                isOnline
                  ? 'bg-emerald-900/60 text-emerald-200 border-emerald-500/40'
                  : 'bg-amber-900/60 text-amber-200 border-amber-500/40'
              }`}
            >
              {isOnline ? (
                <Wifi size={14} className="text-emerald-300" />
              ) : (
                <WifiOff size={14} className="text-amber-300" />
              )}
              <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
              {pendingSyncCount > 0 && (
                <span className="bg-amber-500 text-slate-900 px-1.5 py-0.2 rounded-full font-800 text-[10px]">
                  {pendingSyncCount} waiting
                </span>
              )}
            </div>

            {pendingSyncCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing || !isOnline}
                className="btn btn-sm bg-white text-emerald-900 hover:bg-emerald-50 font-700 shadow-sm gap-1 text-xs"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SUMMARY / KPI CARDS                                      */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* A. My Active Reports */}
        <div
          onClick={() => navigate('/cases')}
          className="card p-4 sm:p-5 border-l-4 border-emerald-600 hover:shadow-md cursor-pointer transition-all bg-white"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-700 uppercase tracking-wider text-gray-500">
              My Active Reports
            </span>
            <FileText size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-800 text-gray-900">
              {loading ? '-' : activeReportsCount}
            </span>
            <span className="text-xs text-gray-500">cases under care</span>
          </div>
        </div>

        {/* B. High Risk Reports */}
        <div
          onClick={() => navigate('/cases')}
          className="card p-4 sm:p-5 border-l-4 border-red-500 hover:shadow-md cursor-pointer transition-all bg-white"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-700 uppercase tracking-wider text-gray-500">
              High Risk Reports
            </span>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-800 text-red-600">
              {loading ? '-' : highRiskCount}
            </span>
            <span className="text-xs text-gray-500">urgent attention</span>
          </div>
        </div>

        {/* C. Pending / Under Review */}
        <div
          onClick={() => navigate('/cases')}
          className="card p-4 sm:p-5 border-l-4 border-amber-500 hover:shadow-md cursor-pointer transition-all bg-white"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-700 uppercase tracking-wider text-gray-500">
              Under Review
            </span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-800 text-amber-700">
              {loading ? '-' : pendingReviewCount}
            </span>
            <span className="text-xs text-gray-500">vet / lab review</span>
          </div>
        </div>

        {/* D. Alerts */}
        <div
          onClick={() => navigate('/alerts')}
          className="card p-4 sm:p-5 border-l-4 border-blue-500 hover:shadow-md cursor-pointer transition-all bg-white"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-700 uppercase tracking-wider text-gray-500">
              District Alerts
            </span>
            <Bell size={18} className="text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-800 text-blue-700">
              {unreadCount}
            </span>
            <span className="text-xs text-gray-500">unread advisories</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. QUICK ACTIONS                                            */}
      {/* ============================================================ */}
      <div className="card p-5 bg-gradient-to-r from-emerald-50 via-white to-green-50 border border-emerald-100">
        <h2 className="text-xs font-800 uppercase tracking-wider text-emerald-900 mb-3 flex items-center gap-1.5">
          <Activity size={15} className="text-emerald-700" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Action 1: Report New Incident */}
          <button
            onClick={() => navigate('/report')}
            className="flex items-center justify-between p-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-700 shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <PlusCircle size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-800">Report Sick Animal</p>
                <p className="text-[11px] text-emerald-100 font-normal">Fast photo & symptom triage</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Action 2: View My Cases */}
          <button
            onClick={() => navigate('/cases')}
            className="flex items-center justify-between p-3.5 bg-white hover:bg-emerald-50/60 text-gray-900 rounded-xl font-700 border border-emerald-200/80 shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                <FileText size={18} />
              </div>
              <div className="text-left">
                <p className="text-sm font-800">Track My Reports</p>
                <p className="text-[11px] text-gray-500 font-normal">View case history & status</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Action 3: View Alerts */}
          <button
            onClick={() => navigate('/alerts')}
            className="flex items-center justify-between p-3.5 bg-white hover:bg-blue-50/60 text-gray-900 rounded-xl font-700 border border-blue-200/80 shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0 relative">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-800">Village Health Alerts</p>
                <p className="text-[11px] text-gray-500 font-normal">Outbreak notices & advisories</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. MAIN SPLIT: MY RECENT REPORTS + AI EARLY WARNING          */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT 2 COLS: MY RECENT REPORTS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title text-base flex items-center gap-2">
              <FileText size={18} className="text-emerald-700" />
              My Recent Reports
            </h2>
            {allFarmerCases.length > 0 && (
              <button
                onClick={() => navigate('/cases')}
                className="text-xs font-700 text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
              >
                View all ({allFarmerCases.length}) <ArrowRight size={13} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="card p-8 text-center text-gray-400 text-sm space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading your reports...</p>
            </div>
          ) : allFarmerCases.length === 0 ? (
            <div className="card p-8 text-center space-y-3 bg-white border border-gray-100">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-xl">
                🐄
              </div>
              <h3 className="font-800 text-gray-900 text-base">No incidents reported yet</h3>
              <p className="text-gray-500 text-xs max-w-md mx-auto">
                All your animals look healthy! If an animal shows symptoms like fever, blisters, or reduced feeding, report it immediately for fast AI triage.
              </p>
              <button
                onClick={() => navigate('/report')}
                className="btn btn-primary bg-emerald-700 hover:bg-emerald-800 btn-sm gap-1.5 shadow-sm mt-2"
              >
                <PlusCircle size={15} />
                Report First Incident
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {allFarmerCases.slice(0, 5).map(c => {
                const tr = c.triageResult;
                const ir = c.incidentReport;
                const emoji = SPECIES_EMOJI[ir.species] || '🐾';

                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="card p-4 hover:border-emerald-500 hover:shadow-sm transition-all cursor-pointer bg-white group"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-lg flex-shrink-0 border border-emerald-100">
                          {emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-700 text-emerald-800">
                              {c.id}
                            </span>
                            {c.isOfflinePending ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-700 border border-amber-200">
                                <WifiOff size={10} /> Pending Sync
                              </span>
                            ) : (
                              <Badge variant={ir.status} size="sm" />
                            )}
                          </div>
                          <h3 className="text-sm font-800 text-gray-900 capitalize mt-0.5 truncate group-hover:text-emerald-700 transition-colors">
                            {ir.species} Incident · {ir.affectedAnimals} of {ir.totalAnimals} affected
                          </h3>
                        </div>
                      </div>

                      {tr && <Badge variant={tr.riskBand} size="sm" />}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        {ir.location.village || 'Local Village'}, {ir.location.district}
                      </span>
                      <span className="text-gray-400">
                        Reported {format(new Date(ir.createdAt), 'dd MMM yyyy, HH:mm')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT 1 COL: AI EARLY WARNING + OFFLINE QUEUE STATUS */}
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* 5. AI RISK SECTION                                          */}
          {/* ============================================================ */}
          <div className="card p-5 bg-white border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-xs font-800 uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-purple-700" />
                AI Risk Assessment
              </h2>
              <span className="text-[10px] font-700 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                Early Warning
              </span>
            </div>

            {primaryCase?.triageResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500 font-600">Latest Assessment for:</p>
                    <p className="text-sm font-800 text-gray-900 capitalize font-mono">
                      {primaryCase.id} ({primaryCase.incidentReport.species})
                    </p>
                  </div>
                  <RiskScoreRing
                    score={primaryCase.triageResult.riskScore}
                    riskBand={primaryCase.triageResult.riskBand}
                    size="sm"
                  />
                </div>

                <div className="p-3 bg-purple-50/70 rounded-xl text-xs border border-purple-100">
                  <p className="font-700 text-purple-950">
                    Recommended Action:
                  </p>
                  <p className="text-purple-900 text-[11px] mt-0.5 leading-relaxed">
                    {primaryCase.triageResult.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-3 space-y-2">
                <p className="text-xs text-gray-600">
                  When you report symptoms, our AI engine estimates transmission risk and alerts local veterinary officers for priority field visits.
                </p>
              </div>
            )}

            {/* MANDATORY DOMAIN SAFETY NOTICE */}
            <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
              <HelpCircle size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="leading-tight">
                <strong>Safety Notice:</strong> AI risk assessment provides an early-warning indication based on reported symptoms and available evidence. It does not replace veterinary diagnosis.
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 7. OFFLINE STATUS & SYNC                                    */}
          {/* ============================================================ */}
          <div className="card p-5 bg-white border border-gray-100 space-y-3">
            <h2 className="text-xs font-800 uppercase tracking-wider text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {isOnline ? (
                  <Wifi size={15} className="text-emerald-600" />
                ) : (
                  <WifiOff size={15} className="text-amber-600" />
                )}
                Offline Sync Status
              </span>
              <span className="font-mono text-[11px] text-gray-400">IndexedDB</span>
            </h2>

            {pendingSyncCount > 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2">
                <p className="font-700 text-amber-900">
                  ⚠️ {pendingSyncCount} report{pendingSyncCount > 1 ? 's' : ''} waiting to sync
                </p>
                <p className="text-[11px] text-amber-800 leading-tight">
                  Captured offline and stored safely on this device. They will synchronize automatically when internet is available.
                </p>
                {isOnline && (
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="btn btn-primary bg-amber-600 hover:bg-amber-700 btn-sm text-white w-full text-xs font-700 gap-1 mt-1"
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Synchronizing...' : 'Sync Now'}
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-700 text-emerald-900">All reports synced</p>
                  <p className="text-[11px] text-emerald-700">Device storage is up to date with district network.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. RECENT ALERTS PREVIEW                                    */}
      {/* ============================================================ */}
      <div className="card p-5 bg-white border border-gray-100 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-base font-800 text-gray-900 flex items-center gap-2">
              <Bell size={18} className="text-blue-600" />
              Recent Alerts & Village Advisories
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Live disease warnings and vaccination notices for your district
            </p>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs font-700 text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            View All Alerts <ArrowRight size={13} />
          </button>
        </div>

        {recentAlerts.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No active alerts for your region.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => navigate('/alerts')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  alert.severity === 'critical'
                    ? 'bg-red-50/70 border-red-200 hover:border-red-400'
                    : alert.severity === 'danger'
                    ? 'bg-orange-50/70 border-orange-200 hover:border-orange-400'
                    : alert.severity === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400'
                    : 'bg-blue-50/70 border-blue-200 hover:border-blue-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-800 text-gray-900 truncate">
                    {alert.title}
                  </h3>
                  <Badge
                    variant={
                      alert.severity === 'critical'
                        ? 'critical'
                        : alert.severity === 'danger' || alert.severity === 'warning'
                        ? 'high'
                        : 'info'
                    }
                    label={alert.severity.toUpperCase()}
                    size="sm"
                  />
                </div>
                <p className="text-[11px] text-gray-700 mt-1 line-clamp-2 leading-relaxed">
                  {alert.message}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 font-mono">
                  {format(new Date(alert.createdAt || alert.timestamp || Date.now()), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
