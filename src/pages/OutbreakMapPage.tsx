// ============================================================
// OutbreakMapPage — Module 5: Spatio-Temporal Cluster Map
// Leaflet Map integration with risk heatmaps & radius clusters
// ============================================================

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Map as MapIcon, Filter, Layers } from 'lucide-react';
import { SYNTHETIC_MAP_CASES } from '../data/seed';
import { Badge } from '../components/ui/Badge';

// Custom Leaflet marker icons using inline SVG data URIs
const createCustomIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="12" cy="12" r="5" fill="#ffffff"/>
  </svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -32],
  });
};

const MARKER_ICONS = {
  high: createCustomIcon('#dc2626'),
  moderate: createCustomIcon('#d97706'),
  low: createCustomIcon('#16a34a'),
};

const RADIUS_COLORS = {
  high: '#ef4444',
  moderate: '#f59e0b',
  low: '#22c55e',
};

export function OutbreakMapPage() {
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [showClusters, setShowClusters] = useState<boolean>(true);

  const filteredCases = SYNTHETIC_MAP_CASES.filter(item => {
    const matchRisk = selectedRisk === 'all' || item.riskBand === selectedRisk;
    const matchSpecies = selectedSpecies === 'all' || item.species === selectedSpecies;
    return matchRisk && matchSpecies;
  });

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title text-xl">
            <MapIcon size={22} className="text-green-700" />
            Spatio-Temporal Outbreak & Cluster Map
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Nashik Surveillance Region · DBSCAN Radius Clustering ·{' '}
            <span className="synthetic-watermark">Synthetic Map Data</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClusters(s => !s)}
            className={`btn btn-sm ${showClusters ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Layers size={14} />
            {showClusters ? 'Hide Cluster Zones' : 'Show Cluster Zones'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-3 flex items-center justify-between gap-3 flex-wrap bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-gray-400" />
          <span className="text-xs font-700 text-gray-600 uppercase">Risk Level:</span>
          {['all', 'high', 'moderate', 'low'].map(r => (
            <button
              key={r}
              onClick={() => setSelectedRisk(r)}
              className={`px-2.5 py-1 text-xs rounded-lg font-600 capitalize transition-all ${
                selectedRisk === r
                  ? 'bg-green-800 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-700 text-gray-600 uppercase">Species:</span>
          <select
            value={selectedSpecies}
            onChange={e => setSelectedSpecies(e.target.value)}
            className="form-select text-xs py-1 px-2.5 w-auto"
          >
            <option value="all">All Species</option>
            <option value="cattle">Cattle</option>
            <option value="buffalo">Buffalo</option>
            <option value="goat">Goat</option>
            <option value="sheep">Sheep</option>
          </select>
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="card p-0 overflow-hidden relative shadow-lg border border-gray-200" style={{ height: 'calc(100vh - 250px)', minHeight: 450 }}>
        <MapContainer
          center={[20.0059, 73.7930]}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredCases.map(c => {
            const icon = MARKER_ICONS[c.riskBand as keyof typeof MARKER_ICONS] ?? MARKER_ICONS.low;
            const radiusColor = RADIUS_COLORS[c.riskBand as keyof typeof RADIUS_COLORS] ?? '#16a34a';

            return (
              <div key={c.id}>
                {/* Cluster Circle Overlay */}
                {showClusters && (
                  <Circle
                    center={[c.lat, c.lng]}
                    radius={c.riskBand === 'high' ? 3000 : 1800}
                    pathOptions={{
                      color: radiusColor,
                      fillColor: radiusColor,
                      fillOpacity: c.riskBand === 'high' ? 0.2 : 0.1,
                      weight: 1.5,
                    }}
                  />
                )}

                {/* Marker */}
                <Marker position={[c.lat, c.lng]} icon={icon}>
                  <Popup>
                    <div className="p-1 space-y-1.5 min-w-[180px]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-gray-400">{c.id}</span>
                        <Badge variant={c.riskBand as any} size="sm" />
                      </div>

                      <p className="font-800 text-sm text-gray-900 capitalize">
                        {String(c.disease) !== 'unknown' ? `${c.disease} Suspected` : 'Unknown Illness'}
                      </p>

                      <p className="text-xs text-gray-600">
                        Village: <strong>{c.village}</strong>
                      </p>

                      <p className="text-xs text-gray-600">
                        Affected: <span className="font-700 text-red-600">{c.count} {c.species}</span>
                      </p>

                      <div className="pt-1 text-[10px] text-gray-400 border-t flex justify-between">
                        <span>Lat: {c.lat.toFixed(3)}</span>
                        <span>Lng: {c.lng.toFixed(3)}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>

        {/* Floating Legend Overlay */}
        <div className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-gray-200 text-xs space-y-2">
          <p className="font-700 text-gray-800 uppercase tracking-wider text-[10px]">Map Legend</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
            <span>High Risk Cluster (3km Zone)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Moderate Risk (1.8km Zone)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
            <span>Low Risk Case</span>
          </div>
        </div>
      </div>
    </div>
  );
}
