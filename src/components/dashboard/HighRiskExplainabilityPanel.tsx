// ============================================================
// HighRiskExplainabilityPanel — "WHY IS THIS AREA HIGH RISK?"
// Member 5 — Risk Engine Explainability Component
// Shows actual factors from AI triage engine (e.g. 8 reports in 72h,
// 3 nearby villages affected, vaccination coverage 54%, increasing trend)
// ============================================================

import { Brain, ShieldAlert, Info, Sparkles } from 'lucide-react';
import type { TriageFactor, RiskBand } from '../../types';
import { Badge } from '../ui/Badge';

interface HighRiskExplainabilityPanelProps {
  locationName?: string;
  riskBand?: RiskBand;
  riskScore?: number;
  factors?: TriageFactor[];
  isSynthetic?: boolean;
}

const DEFAULT_FACTORS: TriageFactor[] = [
  { label: '8 similar symptom reports within 72 hours', value: 'High spatio-temporal velocity', weight: 32, direction: 'risk' },
  { label: '3 nearby villages affected (Chandori, Niphad, Ozar)', value: 'Contagion proximity (3km)', weight: 26, direction: 'risk' },
  { label: 'Low local vaccination coverage (54%)', value: 'Target minimum: 80%', weight: 22, direction: 'risk' },
  { label: 'Increasing 7-day case velocity (+45%)', value: 'Epidemic growth pattern', weight: 18, direction: 'risk' },
  { label: 'Recent RT-PCR confirmed case (FMD Serotype O)', value: 'Laboratory confirmed strain', weight: 14, direction: 'risk' },
  { label: 'Proactive veterinary visit dispatched', value: 'Clinical triage active', weight: 12, direction: 'protective' },
];

export function HighRiskExplainabilityPanel({
  locationName = 'Chandori-Niphad Risk Belt',
  riskBand = 'critical',
  riskScore = 88,
  factors = DEFAULT_FACTORS,
  isSynthetic = true,
}: HighRiskExplainabilityPanelProps) {
  const riskFactors = factors.filter(f => f.direction === 'risk');
  const protectiveFactors = factors.filter(f => f.direction === 'protective');

  return (
    <div className="card p-5 space-y-4 bg-white border border-gray-200 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h2 className="text-sm font-800 uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              WHY IS THIS AREA HIGH RISK?
            </h2>
            <p className="text-xs text-gray-500">
              Risk Engine Factor Attribution · <strong className="text-gray-700">{locationName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={riskBand} />
          <span className="font-mono text-sm font-800 text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
            {riskScore} / 100
          </span>
        </div>
      </div>

      {/* Synthetic Risk Engine Watermark Disclaimer */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
        <Brain size={16} className="text-blue-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-700 block">Surveillance Triage Explainability</strong>
          This panel attributes the composite risk score using spatio-temporal clustering, vaccination coverage gaps, and symptom similarity.
          {isSynthetic && <span className="ml-1 font-semibold text-blue-800 font-mono text-[10px]">(Synthetic Risk Engine Data)</span>}
        </div>
      </div>

      {/* Factor Breakdown List */}
      <div className="space-y-3">
        <h3 className="text-xs font-700 uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-600" />
          Primary Risk Driving Factors
        </h3>

        <div className="space-y-2.5">
          {riskFactors.map((factor, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 hover:border-red-200 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-800 text-[11px] flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-700 text-gray-900">{factor.label}</h4>
                    <p className="text-[11px] text-gray-500">{factor.value}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-800 text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex-shrink-0">
                  +{factor.weight}%
                </span>
              </div>

              {/* Progress bar fill */}
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min((factor.weight ?? 0) * 3, 100)}%`,
                    backgroundColor: riskBand === 'critical' ? '#7c3aed' : '#dc2626',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Protective Factors (if any) */}
        {protectiveFactors.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-700 uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1.5">
              <Info size={14} className="text-green-600" /> Mitigation / Protective Factors
            </h4>
            {protectiveFactors.map((factor, idx) => (
              <div key={idx} className="p-2.5 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between text-xs">
                <span className="font-600 text-green-900">{factor.label}</span>
                <span className="font-mono font-700 text-green-700">−{factor.weight}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
