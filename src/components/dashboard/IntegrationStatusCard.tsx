// ============================================================
// IntegrationStatusCard — Future System Boundaries Display
// Member 5 — Modular Service Boundaries & Schema Stubs
// Displays NADRES, INAPH, State Surveillance, and LIMS boundary status
// ============================================================

import { CheckCircle2, Shield, Network, RefreshCw } from 'lucide-react';
import {
  NadresIntegrationAdapter, InaphIntegrationAdapter,
  StateSurveillanceAdapter, LimsIntegrationAdapter
} from '../../services/integrationAdapters';

export function IntegrationStatusCard() {
  const nadresStatus = NadresIntegrationAdapter.getStatus();
  const inaphStatus = InaphIntegrationAdapter.getStatus();
  const stateStatus = StateSurveillanceAdapter.getStatus();
  const limsStatus = LimsIntegrationAdapter.getStatus();

  const systems = [
    { name: nadresStatus.systemName, code: 'NADRES', desc: nadresStatus.description, target: 'ICAR-NIVEDI Epidemiology Database' },
    { name: inaphStatus.systemName, code: 'INAPH', desc: inaphStatus.description, target: 'NDDB Animal Health & Tagging' },
    { name: stateStatus.systemName, code: 'STATE-AH', desc: stateStatus.description, target: 'Department of Animal Husbandry' },
    { name: limsStatus.systemName, code: 'LIMS', desc: limsStatus.description, target: 'Regional Diagnostic Laboratories' },
  ];

  return (
    <div className="card p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-slate-700 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Network size={20} />
          </div>
          <div>
            <h3 className="text-sm font-800 uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Future Integration Adapters & Service Boundaries
            </h3>
            <p className="text-xs text-slate-400">
              Standardized schemas structured for seamless data exchange with authorized national & state portals
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-blue-900/60 text-blue-300 border border-blue-700/50 flex items-center gap-1.5">
          <RefreshCw size={12} className="animate-pulse text-blue-400" />
          Service Boundaries Active (Stubs)
        </span>
      </div>

      {/* Grid of 4 External Systems */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {systems.map(sys => (
          <div
            key={sys.code}
            className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-800 text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800/50">
                {sys.code}
              </span>
              <span className="text-[10px] font-700 text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                Adapter Ready (Stub)
              </span>
            </div>

            <div>
              <h4 className="text-xs font-700 text-slate-200">{sys.name}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{sys.desc}</p>
            </div>

            <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <span>Target: {sys.target}</span>
              <CheckCircle2 size={12} className="text-emerald-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Boundary Policy Disclaimer */}
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <Shield size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-200">Architecture Policy Notice:</strong> This sentinel platform is architected as an independent early warning & response engine. It defines typed payload schemas for exporting to NADRES and INAPH, and importing from State and Lab LIMS portals when authorization keys are provisioned.
        </p>
      </div>
    </div>
  );
}
