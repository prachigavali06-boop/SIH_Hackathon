// ============================================================
// AdminPage — Member 5: System Administration & Surveillance Health
// User management, synthetic data reset, audit logging & Integration boundaries
// ============================================================

import { useState } from 'react';
import { Settings, Shield, RefreshCw, Server, Users, Database, Activity, Network } from 'lucide-react';
import { DEMO_USERS } from '../data/seed';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { IntegrationStatusCard } from '../components/dashboard/IntegrationStatusCard';

export function AdminPage() {
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const handleResetData = () => {
    setSeeding(true);
    setTimeout(() => {
      setSeeding(false);
      setSeedMsg('Synthetic database & GIS surveillance cluster seeds successfully reset to default state.');
    }, 600);
  };

  return (
    <div className="space-y-6 page-enter pb-10">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl flex items-center gap-2">
            <Settings size={22} className="text-gray-800" />
            Surveillance System Administration & System Health
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Role-Based Access Control · System Diagnostics · Integration Adapter Status · Synthetic Seed Controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetData}
            disabled={seeding}
            className="btn btn-sm btn-secondary flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
            {seeding ? 'Resetting…' : 'Reset Synthetic Seed Data'}
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className="alert-banner success text-xs">
          {seedMsg}
        </div>
      )}

      {/* System Health Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Database Status"
          value="Connected"
          icon={Database}
          change="Supabase / PostgreSQL"
          changeDirection="neutral"
          accentColor="#16a34a"
        />
        <StatCard
          label="AI Triage Engine"
          value="Active (TS)"
          icon={Activity}
          change="Latency: 14ms"
          changeDirection="neutral"
          accentColor="#7c3aed"
        />
        <StatCard
          label="Integration Boundaries"
          value="4 Adapters"
          icon={Network}
          change="NADRES/INAPH/State/LIMS"
          changeDirection="neutral"
          accentColor="#0284c7"
        />
        <StatCard
          label="PWA Offline Queue"
          value="0 Pending"
          icon={Server}
          change="IndexedDB Ready"
          changeDirection="neutral"
          accentColor="#d97706"
        />
      </div>

      {/* Integration Boundaries & Stubs Card */}
      <IntegrationStatusCard />

      {/* Users Management */}
      <div className="card p-5 space-y-4 bg-white border border-gray-200">
        <h2 className="text-sm font-700 text-gray-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
          <Users size={16} /> User Registry & Role Assignments
        </h2>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Role</th>
                <th>Jurisdiction / District</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_USERS.map(user => (
                <tr key={user.id}>
                  <td className="font-600 text-gray-900">{user.name}</td>
                  <td>
                    <span className="chip uppercase text-[10px] tracking-wider">
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-gray-600">{user.district}</td>
                  <td className="font-mono text-xs text-gray-500">{user.phone ?? 'N/A'}</td>
                  <td>
                    <Badge variant="negative" label="Active" size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Log */}
      <div className="card p-5 space-y-3 bg-white border border-gray-200">
        <h2 className="text-sm font-700 text-gray-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
          <Shield size={16} /> Audit & Governance Log
        </h2>

        <div className="space-y-2 text-xs font-mono text-gray-600">
          <div className="p-2 bg-gray-50 rounded border flex justify-between">
            <span>[2026-08-27 18:30:00] SURVEILLANCE_FILTER_QUERY executed by Dr. S.K. Mishra (Gov Officer)</span>
            <span className="text-green-700 font-600">SUCCESS</span>
          </div>
          <div className="p-2 bg-gray-50 rounded border flex justify-between">
            <span>[2026-08-24 11:00:00] CONTAINMENT_ORDER_ISSUED by Dr. S.K. Mishra (Gov Officer) - Chandori Zone</span>
            <span className="text-green-700 font-600">SUCCESS</span>
          </div>
          <div className="p-2 bg-gray-50 rounded border flex justify-between">
            <span>[2026-08-24 10:00:00] LAB_RESULT_ENTRY by Priya Sharma (Lab Tech) - RT-PCR FMD Pos</span>
            <span className="text-green-700 font-600">VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
