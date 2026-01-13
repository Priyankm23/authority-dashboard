import React, { useState, useEffect } from 'react';
import { MapPin, Users, AlertTriangle, Eye, Navigation, Phone, ShieldAlert } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchMapOverview, MapOverviewResponse, MapTourist, MapZone, MapAlert, MapIncident, MapRiskGrid } from '../api/map';

// @ts-ignore - leaflet.heat doesn't have bundled types
import 'leaflet.heat';

// Fix default icon paths for Leaflet when bundlers change the asset location
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/node_modules/leaflet/dist/images/marker-icon-2x.png',
  iconUrl: '/node_modules/leaflet/dist/images/marker-icon.png',
  shadowUrl: '/node_modules/leaflet/dist/images/marker-shadow.png'
});

// Custom Icons
const alertIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const touristActiveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const touristExpiredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const incidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


// Simple Heatmap layer wrapper
type HeatProps = { points: MapRiskGrid[] };

function HeatmapLayer({ points }: HeatProps) {
  const map = useMap();
  // Create points array: [lat, lng, intensity]
  const heatPoints: Array<[number, number, number]> = points.map(p => [p.location.lat, p.location.lng, p.intensity]);

  useEffect(() => {
    if (!map || heatPoints.length === 0) return;
    // @ts-ignore
    const heat = (L as any).heatLayer(heatPoints, { radius: 35, blur: 20, maxZoom: 12 }).addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points]);

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
  const [data, setData] = useState<MapOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{id: string, type: 'tourist' | 'zone' | 'alert' | 'incident'} | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await fetchMapOverview();
        if (mounted) setData(result);
      } catch (e) {
        console.error('Failed to load map overview', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'high': case 'very high': return 'bg-red-500 border-red-600';
      case 'medium': return 'bg-yellow-500 border-yellow-600';
      case 'low': return 'bg-green-500 border-green-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const getZoneColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
        case 'high': case 'very high': return '#ef4444';
        case 'medium': return '#f59e0b';
        case 'low': return '#10b981';
        default: return '#6b7280';
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
          <button 
             onClick={() => window.location.reload()}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Navigation className="h-4 w-4" />
            <span>Refresh Data</span>
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
            <div className="relative h-96 p-0 bg-gray-100">
              {loading && (
                  <div className="absolute inset-0 flex items-center justify-center z-[1000] bg-white bg-opacity-70">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
              )}
              {data && (
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
                {data.mapData.tourists.map((t) => (
                  <Marker
                    key={t.id}
                    position={[t.location.lat, t.location.lng]}
                    icon={t.status === 'active' ? touristActiveIcon : touristExpiredIcon}
                    eventHandlers={{ click: () => setSelectedEntity({ id: t.id, type: 'tourist' }) }}
                  >
                  </Marker>
                ))}

                {/* SOS markers */}
                {data.mapData.activeAlerts.map((a) => (
                  <Marker
                    key={a.id}
                    position={[a.location.lat, a.location.lng]}
                    icon={alertIcon}
                    zIndexOffset={100}
                    eventHandlers={{ click: () => setSelectedEntity({ id: a.id, type: 'alert' }) }}
                  >
                  </Marker>
                ))}

                 {/* Incident markers */}
                 {data.mapData.incidents.map((i) => (
                  <Marker
                    key={i.id}
                    position={[i.location.lat, i.location.lng]}
                    icon={incidentIcon}
                    eventHandlers={{ click: () => setSelectedEntity({ id: i.id, type: 'incident' }) }}
                  >
                  </Marker>
                ))}

                {/* Risk zone circles */}
                {data.mapData.zones.map((zone) => {
                  return (
                    <Circle
                      key={zone.id}
                      center={[zone.coordinates[0], zone.coordinates[1]]}
                      radius={zone.radius} // meters
                      pathOptions={{ color: getZoneColor(zone.riskLevel), opacity: 0.35, fillOpacity: 0.2 }}
                      eventHandlers={{ click: () => setSelectedEntity({ id: zone.id, type: 'zone' }) }}
                    />
                  );
                })}

                <HeatmapLayer points={data.mapData.riskGrids} />
              </MapContainer>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Details Panel */}
          {selectedEntity && data && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-in slide-in-from-right duration-200">
               {selectedEntity.type === 'tourist' && (() => {
                  const tourist = data.mapData.tourists.find(t => t.id === selectedEntity.id);
                  if(!tourist) return null;
                  return (
                    <>
                        <div className="p-4 bg-blue-50 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">Tourist Details</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{tourist.name}</span>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${tourist.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {tourist.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>ID:</strong> {tourist.id}</p>
                                <p><strong>Safety Score:</strong> {tourist.safetyScore}/100</p>
                                <p><strong>Coordinates:</strong> {tourist.location.lat.toFixed(4)}, {tourist.location.lng.toFixed(4)}</p>
                            </div>
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors mt-2">
                                View Profile
                            </button>
                        </div>
                    </>
                  );
               })()}

               {selectedEntity.type === 'zone' && (() => {
                  const zone = data.mapData.zones.find(z => z.id === selectedEntity.id);
                  if(!zone) return null;
                  return (
                    <>
                         <div className="p-4 bg-red-50 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">Risk Zone Details</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{zone.name}</span>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRiskColor(zone.riskLevel).replace('border-', 'text-').replace('bg-', 'bg-').split(' ')[0]} bg-opacity-20`}>
                                    {zone.riskLevel.toUpperCase()}
                                </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Type:</strong> {zone.shape}</p>
                                <p><strong>Radius:</strong> {(zone.radius / 1000).toFixed(1)} km</p>
                            </div>
                        </div>
                    </>
                  );
               })()}

               {selectedEntity.type === 'alert' && (() => {
                   const alert = data.mapData.activeAlerts.find(a => a.id === selectedEntity.id);
                   if(!alert) return null;
                   return (
                       <>
                         <div className="p-4 bg-red-100 border-b border-red-200">
                            <h3 className="font-semibold text-red-900 flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2" /> SOS Alert
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                             <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Alert ID:</strong> {alert.id}</p>
                                <p><strong>Status:</strong> <span className="capitalize">{alert.status}</span></p>
                                <p><strong>Priority:</strong> <span className={`font-semibold ${alert.priority === 'high' ? 'text-red-600' : 'text-orange-600'}`}>{alert.priority.toUpperCase()}</span></p>
                                <p><strong>Location:</strong> {alert.locationName || "Unknown Location"}</p>
                                <p><strong>Coordinates:</strong> {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}</p>
                            </div>
                            <button className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors mt-2">
                                Dispatch Response
                            </button>
                        </div>
                       </>
                   )
               })()}

               {selectedEntity.type === 'incident' && (() => {
                   const incident = data.mapData.incidents.find(i => i.id === selectedEntity.id);
                   if(!incident) return null;
                   return (
                       <>
                         <div className="p-4 bg-orange-50 border-b border-orange-200">
                            <h3 className="font-semibold text-orange-900 flex items-center">
                                <ShieldAlert className="w-4 h-4 mr-2" /> Incident Report
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                             <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Title:</strong> {incident.title}</p>
                                <p><strong>Category:</strong> <span className="capitalize">{incident.category}</span></p>
                                <p><strong>Incident ID:</strong> {incident.id}</p>
                                <p><strong>Coordinates:</strong> {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}</p>
                            </div>
                            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm transition-colors mt-2">
                                View Full Report
                            </button>
                        </div>
                       </>
                   )
               })()}
            </div>
          )}

          {/* Statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Live Statistics</h3>
            </div>
            {loading ? (
                <div className="p-4 text-center text-gray-500">Loading stats...</div>
            ) : data ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Tourists</span>
                <span className="font-semibold text-green-600">{data.stats.totalTourists}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Alerts</span>
                <span className="font-semibold text-red-600">{data.stats.activeAlerts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">High Risk Zones</span>
                <span className="font-semibold text-orange-600">{data.stats.highRiskZones}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Response Units</span>
                <span className="font-semibold text-blue-600">{data.stats.responseUnits} Available</span>
              </div>
            </div>
            ) : null}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Map Legend</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                 <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" className="w-4 h-6" />
                <span>Active Tourist</span>
              </div>
              <div className="flex items-center space-x-2">
                 <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png" className="w-4 h-6" />
                <span>Expired/Inactive Tourist</span>
              </div>
              <div className="flex items-center space-x-2">
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" className="w-4 h-6" />
                <span>Active SOS Alert</span>
              </div>
               <div className="flex items-center space-x-2">
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png" className="w-4 h-6" />
                <span>Incident Report</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full opacity-30"></div>
                <span>High Risk Zone</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouristMap;
