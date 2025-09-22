import React, { useState, useEffect } from 'react';
import { MapPin, Users, AlertTriangle, Eye, Navigation, Phone } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockTourists, mockSOSAlerts } from '../utils/mockData';
import { getZones, Zone as ApiZone } from '../api/geofence';

// @ts-ignore - leaflet.heat doesn't have bundled types
import 'leaflet.heat';

// Fix default icon paths for Leaflet when bundlers change the asset location
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/node_modules/leaflet/dist/images/marker-icon-2x.png',
  iconUrl: '/node_modules/leaflet/dist/images/marker-icon.png',
  shadowUrl: '/node_modules/leaflet/dist/images/marker-shadow.png'
});

// Simple Heatmap layer wrapper for react-leaflet using leaflet.heat
type HeatProps = { data: typeof mockTourists };

function HeatmapLayer({ data }: HeatProps) {
  const map = useMap();
  // Create points array: [lat, lng, intensity]
  const points: Array<[number, number, number]> = data.map(t => [t.lastKnownLocation.lat, t.lastKnownLocation.lng, 0.8]);

  useEffect(() => {
    if (!map) return;
    // @ts-ignore
    const heat = (L as any).heatLayer(points, { radius: 25, blur: 15, maxZoom: 12 }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, data]);

  return null;
}

function BoundSetter() {
  const map = useMap();
  useEffect(() => {
    const southWest = L.latLng(6.5546, 68.1114);
    const northEast = L.latLng(35.6745, 97.3956);
    map.setMaxBounds(L.latLngBounds(southWest, northEast));
  }, [map]);
  return null;
}

const TouristMap: React.FC = () => {
  const [selectedTourist, setSelectedTourist] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const [zones, setZones] = useState<ApiZone[]>([]);

  // Fetch geofence zones from backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getZones();
        if (mounted) setZones(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load geofence zones', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-500 border-red-600';
      case 'medium': return 'bg-yellow-500 border-yellow-600';
      case 'low': return 'bg-green-500 border-green-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 border-green-600';
      case 'expired': return 'bg-red-500 border-red-600';
      case 'revoked': return 'bg-gray-500 border-gray-600';
      default: return 'bg-blue-500 border-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tourist Clusters & Heatmap</h1>
          <p className="text-gray-600 mt-2">Real-time tourist distribution and risk zone monitoring</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Navigation className="h-4 w-4" />
            <span>Live Tracking</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Map Area */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Interactive Map View</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Active</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>High Risk</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Medium Risk</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Real Map using Leaflet */}
            <div className="relative h-96 p-0">
              <MapContainer
                center={[22.5937, 78.9629]}
                zoom={5}
                minZoom={4}
                maxZoom={12}
                style={{ height: '384px', width: '100%' }}
                scrollWheelZoom={true}
              >
                <BoundSetter />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Tourist markers */}
                {mockTourists.map((t) => (
                  <Marker
                    key={t.id}
                    position={[t.lastKnownLocation.lat, t.lastKnownLocation.lng]}
                    eventHandlers={{ click: () => setSelectedTourist(t.id) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{t.name}</strong>
                        <div>{t.lastKnownLocation.address}</div>
                        <div>Safety: {t.safetyScore}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* SOS markers */}
                {mockSOSAlerts.map((a) => (
                  <Marker
                    key={a.id}
                    position={[a.location.lat, a.location.lng]}
                    eventHandlers={{ click: () => console.log('SOS clicked', a.id) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{a.touristName}</strong>
                        <div>{a.location.address}</div>
                        <div>Type: {a.emergencyType}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Risk zone circles (from backend) */}
                {zones.map((zone) => {
                  const lat = zone.coords ? zone.coords[0] : undefined;
                  const lng = zone.coords ? zone.coords[1] : undefined;
                  const risk = (zone.riskLevel || '').toLowerCase();
                  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
                  return (
                    <Circle
                      key={zone.id}
                      center={[lat, lng]}
                      radius={(zone.radiusKm || 1) * 1000}
                      pathOptions={{ color: risk === 'very high' || risk === 'high' ? '#ef4444' : risk === 'medium' ? '#f59e0b' : '#10b981', opacity: 0.35 }}
                      eventHandlers={{ click: () => setSelectedZone(zone.id) }}
                    />
                  );
                })}

                <HeatmapLayer data={mockTourists} />
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Tourist Details Panel */}
          {selectedTourist && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 bg-blue-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Tourist Details</h3>
              </div>
              <div className="p-4">
                {(() => {
                  const tourist = mockTourists.find(t => t.id === selectedTourist);
                  return tourist ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{tourist.name}</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(tourist.status).replace('border-', 'text-').replace('bg-', 'bg-')}`}>
                          {tourist.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>ID:</strong> {tourist.id}</p>
                        <p><strong>Country:</strong> {tourist.country}</p>
                        <p><strong>Safety Score:</strong> {tourist.safetyScore}/100</p>
                        <p><strong>Last Location:</strong> {tourist.lastKnownLocation.address}</p>
                        <p><strong>Timestamp:</strong> {new Date(tourist.lastKnownLocation.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors">
                          <Phone className="h-4 w-4" />
                          <span>Contact</span>
                        </button>
                        <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors">
                          <Eye className="h-4 w-4" />
                          <span>Track</span>
                        </button>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* Zone Details Panel */}
          {selectedZone && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 bg-red-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Risk Zone Details</h3>
              </div>
              <div className="p-4">
                {(() => {
                  const zone = zones.find(z => z.id === selectedZone);
                  return zone ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{zone.name}</span>
                        {(() => {
                          const risk = (zone.riskLevel || 'unknown').toLowerCase();
                          return (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRiskColor(risk).replace('border-', 'text-').replace('bg-', 'bg-')}`}>
                              {String(zone.riskLevel || 'UNKNOWN').toUpperCase()} RISK
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Zone ID:</strong> {zone.id}</p>
                        <p><strong>Radius:</strong> {zone.radiusKm ?? 'N/A'} km</p>
                        <p><strong>Active Tourists:</strong> {Math.floor(Math.random() * 20) + 5}</p>
                        <p><strong>Recent Incidents:</strong> {Math.floor(Math.random() * 5) + 1}</p>
                        <p><strong>Response Units:</strong> {Math.floor(Math.random() * 3) + 1} available</p>
                      </div>
                      <button className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                        Deploy Additional Units
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Live Statistics</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Tourists</span>
                <span className="font-semibold text-green-600">{mockTourists.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Alerts</span>
                <span className="font-semibold text-red-600">{mockSOSAlerts.filter(a => a.status === 'new').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">High Risk Zones</span>
                <span className="font-semibold text-orange-600">{zones.filter(z => (z.riskLevel || '').toLowerCase().includes('high')).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Response Units</span>
                <span className="font-semibold text-blue-600">12 Available</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Map Legend</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full border border-green-600"></div>
                <span>Active Tourist</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border border-red-600"></div>
                <span>Expired/Inactive Tourist</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-2 h-2 text-white" />
                </div>
                <span>Active SOS Alert</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full opacity-30"></div>
                <span>High Risk Zone</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full opacity-30"></div>
                <span>Medium Risk Zone</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouristMap;