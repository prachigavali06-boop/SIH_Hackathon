// ============================================================
// AIExplanationPanel — triage result with explainability
// Always shown alongside any AI risk score
// ============================================================

import { Brain, Info, ShieldAlert } from 'lucide-react';
import type { TriageResult } from '../../types';
import { RiskScoreRing } from './RiskScoreRing';
import { Badge } from './Badge';

interface AIExplanationPanelProps {
  triage: TriageResult;
}

export function AIExplanationPanel({ triage }: AIExplanationPanelProps) {
  const { riskScore, riskBand, factors, recommendation, disclaimer, suspectedDisease } = triage;

  // Separate risk vs protective factors
  const riskFactors       = factors.filter(f => f.direction === 'risk');
  const protectiveFactors = factors.filter(f => f.direction === 'protective');

  return (
    <div className="space-y-4">
      {/* AI Disclaimer — always visible */}
      <div className="ai-disclaimer">
        <Brain size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>AI-Assisted Risk Assessment — Not a Diagnosis</strong>
          <p className="mt-0.5 text-xs opacity-90">{disclaimer}</p>
        </div>
      </div>

      {/* Risk Score + Band */}
      <div className="card p-4 flex items-center gap-5">
        <RiskScoreRing score={riskScore} riskBand={riskBand} size="lg" showLabel />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="suspected" label="Suspected" />
            {suspectedDisease && suspectedDisease !== 'unknown' && (
              <Badge variant="high" label={suspectedDisease} />
            )}
            <Badge variant={riskBand} />
          </div>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Model: {triage.modelVersion}
            {triage.isSynthetic && <span className="ml-2 synthetic-watermark">Synthetic</span>}
          </p>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="card p-4">
        <h4 className="text-sm font-700 text-gray-800 mb-3 flex items-center gap-2">
          <ShieldAlert size={15} className="text-amber-500" />
          Risk Factors
        </h4>
        <div className="space-y-2">
          {riskFactors.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 font-500">{f.label}</span>
                  <span className="text-gray-500">{f.value}</span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${f.weight}%`,
                      backgroundColor: riskBand === 'high' ? '#dc2626' : riskBand === 'moderate' ? '#d97706' : '#16a34a',
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-700 text-red-600 w-8 text-right">+{f.weight}</span>
            </div>
          ))}
        </div>

        {protectiveFactors.length > 0 && (
          <>
            <hr className="divider" />
            <h4 className="text-sm font-700 text-gray-800 mb-3 flex items-center gap-2">
              <Info size={15} className="text-green-600" />
              Protective Factors
            </h4>
            <div className="space-y-2">
              {protectiveFactors.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-500">{f.label}</span>
                      <span className="text-gray-500">{f.value}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bg-green-500"
                        style={{ width: `${f.weight}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-700 text-green-600 w-8 text-right">−{f.weight}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recommendation */}
      <div className="card p-4 border-l-4 border-amber-400 bg-amber-50">
        <h4 className="text-sm font-700 text-amber-800 mb-1">Recommendation</h4>
        <p className="text-sm text-amber-900">{recommendation}</p>
      </div>
    </div>
  );
}
