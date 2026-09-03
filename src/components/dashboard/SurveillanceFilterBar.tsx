// ============================================================
// SurveillanceFilterBar — Hierarchical & Attribute Filter Controls
// Member 5 — Command Center Filter Navigation Component
// State → District → Block → Village + Species, Risk, Status, Time
// ============================================================

import { Filter, RotateCcw, MapPin, Calendar } from 'lucide-react';

export interface FilterState {
  state: string;
  district: string;
  block: string;
  village: string;
  species: string;
  riskLevel: string;
  status: string;
  timePeriod: string;
}

interface SurveillanceFilterBarProps {
  filters: FilterState;
  onFilterChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
}

const DISTRICT_MAP: Record<string, string[]> = {
  Maharashtra: ['Nashik', 'Ahmednagar', 'Pune', 'Kolhapur'],
  Gujarat: ['Anand', 'Surat', 'Vadodara'],
};

const BLOCK_MAP: Record<string, string[]> = {
  Nashik: ['Niphad', 'Sinnar', 'Dindori', 'Malegaon'],
  Ahmednagar: ['Sangamner', 'Akole', 'Rahuri'],
  Pune: ['Baramati', 'Haveli', 'Shirur'],
  Kolhapur: ['Kagal', 'Karveer'],
  Anand: ['Anand', 'Petlad'],
  Surat: ['Choryasi', 'Kamrej'],
  Vadodara: ['Dabhoi', 'Karjan'],
};

const VILLAGE_MAP: Record<string, string[]> = {
  Niphad: ['Chandori', 'Niphad', 'Ozar', 'Pimpalnare', 'Vadner'],
  Sinnar: ['Devpur', 'Wavi'],
  Dindori: ['Pimpalnare', 'Vani'],
  Sangamner: ['Vadner', 'Akole'],
  Baramati: ['Shirsuphal', 'Bhigwan'],
  Kagal: ['Murgud', 'Sonage'],
};

export function SurveillanceFilterBar({ filters, onFilterChange, onReset }: SurveillanceFilterBarProps) {
  const availableDistricts = filters.state !== 'all' ? (DISTRICT_MAP[filters.state] || []) : ['Nashik', 'Ahmednagar', 'Pune', 'Kolhapur', 'Anand', 'Surat'];
  const availableBlocks = filters.district !== 'all' ? (BLOCK_MAP[filters.district] || []) : ['Niphad', 'Sinnar', 'Dindori', 'Sangamner', 'Baramati', 'Kagal'];
  const availableVillages = filters.block !== 'all' ? (VILLAGE_MAP[filters.block] || []) : ['Chandori', 'Niphad', 'Ozar', 'Devpur', 'Pimpalnare', 'Vadner', 'Shirsuphal', 'Murgud'];

  return (
    <div className="card p-4 space-y-3 bg-white border border-gray-200 shadow-sm">
      {/* Primary Line: Title & Reset */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-green-700" />
          <h3 className="text-xs font-700 uppercase tracking-wider text-gray-800">
            Jurisdiction & Surveillance Filters
          </h3>
          <span className="synthetic-watermark">Interactive Filter Scope</span>
        </div>

        <button
          onClick={onReset}
          className="btn btn-xs btn-secondary flex items-center gap-1 text-[11px]"
        >
          <RotateCcw size={12} /> Reset Filters
        </button>
      </div>

      {/* Grid Row 1: Location Hierarchy (State -> District -> Block -> Village) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div>
          <label className="text-[11px] font-600 text-gray-600 mb-1 flex items-center gap-1">
            <MapPin size={11} className="text-green-600" /> State
          </label>
          <select
            value={filters.state}
            onChange={e => onFilterChange({ state: e.target.value, district: 'all', block: 'all', village: 'all' })}
            className="form-select text-xs py-1.5 px-2 bg-gray-50 font-500"
          >
            <option value="all">All States</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Gujarat">Gujarat</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-600 text-gray-600 mb-1 flex items-center gap-1">
            <MapPin size={11} className="text-blue-600" /> District
          </label>
          <select
            value={filters.district}
            onChange={e => onFilterChange({ district: e.target.value, block: 'all', village: 'all' })}
            className="form-select text-xs py-1.5 px-2 bg-gray-50 font-500"
          >
            <option value="all">All Districts</option>
            {availableDistricts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-600 text-gray-600 mb-1 flex items-center gap-1">
            <MapPin size={11} className="text-amber-600" /> Block
          </label>
          <select
            value={filters.block}
            onChange={e => onFilterChange({ block: e.target.value, village: 'all' })}
            className="form-select text-xs py-1.5 px-2 bg-gray-50 font-500"
          >
            <option value="all">All Blocks</option>
            {availableBlocks.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-600 text-gray-600 mb-1 flex items-center gap-1">
            <MapPin size={11} className="text-purple-600" /> Village
          </label>
          <select
            value={filters.village}
            onChange={e => onFilterChange({ village: e.target.value })}
            className="form-select text-xs py-1.5 px-2 bg-gray-50 font-500"
          >
            <option value="all">All Villages</option>
            {availableVillages.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Row 2: Attributes (Species, Risk Level, Case Status, Time Period) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
        <div>
          <label className="text-[11px] font-600 text-gray-600 mb-1 block">Species</label>
          <select
            value={filters.species}
            onChange={e => onFilterChange({ species: e.target.value })}
            className="form-select text-xs py-1.5 px-2 bg-gray-50 capitalize"
          >
            <option value="all">All Species</option>
            <option value="cattle">Cattle</option>
            <option value="buffalo">Buffalo</option>
            <option value="sheep">Sheep</option>
            <option value="goat">Goat</option>
            <option value="pig">Pig</option>
            <option value="poultry">Poultry</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-600 text-gray-600 mb-1 block">Risk Level</label>
          <select
            value={filters.riskLevel}
            onChange={e => onFilterChange({ riskLevel: e.target.value })}
            className="form-select text-xs py-1.5 px-2 bg-gray-50 font-600"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="moderate">MODERATE</option>
            <option value="low">LOW</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-600 text-gray-600 mb-1 block">Case Status</label>
          <select
            value={filters.status}
            onChange={e => onFilterChange({ status: e.target.value })}
            className="form-select text-xs py-1.5 px-2 bg-gray-50 capitalize"
          >
            <option value="all">All Case Statuses</option>
            <option value="reported">Reported</option>
            <option value="triaged">Triaged</option>
            <option value="vet_assigned">Vet Assigned</option>
            <option value="vet_assessed">Vet Assessed</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="sample_dispatched">Sample Dispatched</option>
            <option value="confirmed">Confirmed</option>
            <option value="closed">Closed / Resolved</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-600 text-gray-600 mb-1 flex items-center gap-1">
            <Calendar size={11} className="text-gray-500" /> Time Period
          </label>
          <select
            value={filters.timePeriod}
            onChange={e => onFilterChange({ timePeriod: e.target.value })}
            className="form-select text-xs py-1.5 px-2 bg-gray-50"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>
    </div>
  );
}
