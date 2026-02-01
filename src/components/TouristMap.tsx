import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Map, { 
  Source, 
  Layer, 
  NavigationControl, 
  FullscreenControl, 
  ScaleControl,
  GeolocateControl
} from 'react-map-gl/mapbox';
// Import MapRef as a type
import type { MapRef } from 'react-map-gl/mapbox';
import type { GeoJSONSource } from 'mapbox-gl';
import { RefreshCw, AlertTriangle, Layers, X, ExternalLink, MapPin, Wifi, WifiOff } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchMapOverview, MapOverviewResponse } from '../api/map';
import { onAuthorityEvent, offAuthorityEvent, getAuthoritySocket } from '../utils/socketClient';
import { useToast } from '../components/ToastProvider';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

type LayerVisibility = {
    sos: boolean;
    incidents: boolean;
    zones: boolean;
    activeTourists: boolean;
    inactiveTourists: boolean;
};

const TouristMap: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<MapOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{id: string, type: 'tourist' | 'zone' | 'alert' | 'incident'} | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  
  const [layers, setLayers] = useState<LayerVisibility>({
      sos: true,
      incidents: true,
      zones: true,
      activeTourists: false,
      inactiveTourists: false
  });

  const mapRef = useRef<MapRef>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const result = await fetchMapOverview();
        setData(result);
    } catch (e) {
        console.error('Failed to load map overview', e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket Connection Status
    const checkConnection = () => {
        const socket = getAuthoritySocket();
        setIsConnected(socket?.connected || false);
    }
    
    // Initial check
    checkConnection();
    const interval = setInterval(checkConnection, 2000); // Poll status every 2s

    // Real-time SOS Listener
    const handleNewSOSAlert = (alertData: any) => {
        console.log('🆘 [Map] New SOS Alert received:', alertData);
        
        // 1. Toast Notification
        const locationName = alertData.location?.locationName || 'Unknown Location';
        showToast(`🆘 New SOS Alert! - ${locationName}`, 'error');

        // 2. Update Map Data
        setData(prevData => {
            if (!prevData) return null;
            
            // Check for duplicate
            if (prevData.mapData.activeAlerts.some(a => a.id === alertData.alertId)) return prevData;

            const newAlert = {
                id: alertData.alertId,
                type: 'alert' as const, // Added this line to fix type error
                status: 'active',
                priority: (alertData.severity || 'high') as 'critical' | 'high' | 'medium', 
                location: {
                    lat: alertData.location.coordinates[1],
                    lng: alertData.location.coordinates[0]
                },
                locationName: alertData.location.locationName || 'Unknown',
                timestamp: alertData.timestamp
            };

            return {
                ...prevData,
                mapData: {
                    ...prevData.mapData,
                    activeAlerts: [newAlert, ...prevData.mapData.activeAlerts],
                    // Increment stats
                     
                },
                stats: {
                    ...prevData.stats,
                    activeAlerts: prevData.stats.activeAlerts + 1
                }
            };
        });
    };

    onAuthorityEvent('newSOSAlert', handleNewSOSAlert);

    return () => {
        clearInterval(interval);
        offAuthorityEvent('newSOSAlert', handleNewSOSAlert);
    };
  }, []);

  const toggleLayer = (key: keyof LayerVisibility) => {
      setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // -- GeoJSON Transformations --

  const touristSource = useMemo(() => {
    if (!data) return null;
    return {
      type: 'FeatureCollection',
      features: data.mapData.tourists.map(t => ({
        type: 'Feature',
        properties: { id: t.id, type: 'tourist', status: t.status, name: t.name, safetyScore: t.safetyScore },
        geometry: { type: 'Point', coordinates: [t.location.lng, t.location.lat] }
      }))
    };
  }, [data]);

  const alertSource = useMemo(() => {
    if (!data) return null;
    return {
      type: 'FeatureCollection',
      features: data.mapData.activeAlerts.map(a => ({
        type: 'Feature',
        properties: { id: a.id, type: 'alert', status: a.status, priority: a.priority, locationName: a.locationName },
        geometry: { type: 'Point', coordinates: [a.location.lng, a.location.lat] }
      }))
    };
  }, [data]);

  const incidentSource = useMemo(() => {
    if (!data) return null;
    return {
      type: 'FeatureCollection',
      features: data.mapData.incidents.map(i => ({
         type: 'Feature',
         properties: { id: i.id, type: 'incident', title: i.title, category: i.category },
         geometry: { type: 'Point', coordinates: [i.location.lng, i.location.lat] }
      }))
    };
  }, [data]);

  // Handle Zones (Polygons or Circles)
  const zoneSource = useMemo(() => {
      if (!data) return null;
      return {
          type: 'FeatureCollection',
          features: data.mapData.zones.map(z => {
              // If it's a polygon, expect coordinates to be an array of points
              // If circle-like but just point, stick to Point
              // Backend 'shape' might be 'polygon' or 'circle'
              // Assuming coordinates: z.coords for generic handling
              
              if (z.shape === 'polygon' && Array.isArray(z.coordinates) && Array.isArray(z.coordinates[0])) {
                  return {
                    type: 'Feature',
                    properties: { id: z.id, type: 'zone', riskLevel: z.riskLevel, name: z.name },
                    geometry: { type: 'Polygon', coordinates: [z.coordinates] } 
                  };
              }
              
              // Fallback / Circle center point
              return {
                  type: 'Feature',
                  properties: { id: z.id, type: 'zone', riskLevel: z.riskLevel, name: z.name },
                  geometry: { type: 'Point', coordinates: [z.coordinates[1], z.coordinates[0]] } 
              };
          })
      };
  }, [data]);

  // -- Colors & Styles --
  // Using expressions directly in layers below

  const onMapClick = useCallback((event: any) => {
      // 1. Check if clicked on a feature
      const feature = event.features?.[0];
      
      if (feature && !feature.properties.cluster) {
          // It's a marker/entity - Open Details Panel Directly
          const { id, type } = feature.properties;
          setSelectedEntity({ id, type }); 
      } else if (feature && feature.properties.cluster) {
          // Cluster expansion logic
           const clusterId = feature.properties.cluster_id;
           let sourceId = 'tourists';
           if (feature.layer.id.includes('alert')) sourceId = 'alerts';
           
           const source = mapRef.current?.getSource(sourceId) as GeoJSONSource;
           
           source?.getClusterExpansionZoom(clusterId, (err, zoom) => {
               if (err) return;
               mapRef.current?.easeTo({
                   center: feature.geometry.coordinates,
                   zoom: zoom || 14
               });
           });
      } else {
          // Clicked empty space - Close Panel
          setSelectedEntity(null);
      }
  }, []);



  if (!MAPBOX_TOKEN) {
      return (
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-xl border border-gray-200">
              <div className="text-center p-6">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Mapbox Token Missing</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                      Please add <code>VITE_MAPBOX_TOKEN</code> to your <code>.env</code> file.
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Situation Map</h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-gray-600">Real-time monitoring of alerts, zones, and tourists</p>
            <span className="text-gray-300">|</span>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? 'LIVE FEED ACTIVE' : 'DISCONNECTED'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button 
             onClick={fetchData}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[700px]">
        {/* Main Map Area */}
        <div className="xl:col-span-2 relative h-full rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: 78.9629,
                    latitude: 22.5937,
                    zoom: 4,
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/outdoors-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
                interactiveLayerIds={[
                    ...(touristSource && (layers.activeTourists || layers.inactiveTourists) ? ['tourist-circles', 'tourist-clusters'] : []),
                    ...(alertSource && layers.sos ? ['alert-points', 'alert-clusters'] : []),
                    ...(incidentSource && layers.incidents ? ['incident-points'] : []),
                    ...(zoneSource && layers.zones ? ['zone-circles', 'zone-polygons'] : [])
                ]}
                onClick={onMapClick}
                cursor="pointer"
                padding={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
                <NavigationControl position="top-right" showCompass={false} />
                <FullscreenControl position="top-right" />
                <ScaleControl position="bottom-left" />
                <GeolocateControl position="top-right" />

                {/* --- MAPPED DATA SOURCES --- */}

                {/* ZONES */}
                {zoneSource && layers.zones && (
                    <Source id="zones" type="geojson" data={zoneSource as any}>
                        {/* Fallback Circles */}
                        <Layer
                            id="zone-circles"
                            type="circle"
                            filter={['==', '$type', 'Point']}
                            paint={{
                                'circle-radius': ["interpolate", ["linear"], ["zoom"], 5, 20, 15, 300],
                                'circle-color': [
                                    'match', ['downcase', ['get', 'riskLevel']],
                                    'high', '#ef4444',
                                    'very high', '#ef4444',
                                    'medium', '#f59e0b',
                                    '#10b981'
                                ],
                                'circle-opacity': 0.2,
                                'circle-stroke-width': 1,
                                'circle-stroke-color': '#ef4444'
                            }}
                        />
                        {/* Polygons */}
                        <Layer
                            id="zone-polygons"
                            type="fill"
                            filter={['==', '$type', 'Polygon']}
                            paint={{
                                'fill-color': [
                                    'match', ['downcase', ['get', 'riskLevel']],
                                    'high', '#ef4444', 
                                    'medium', '#f59e0b',
                                    '#10b981'
                                ],
                                'fill-opacity': 0.2
                            }}
                        />
                        <Layer
                            id="zone-polygon-borders"
                            type="line"
                            filter={['==', '$type', 'Polygon']}
                            paint={{
                                'line-color': '#ef4444',
                                'line-width': 1
                            }}
                        />
                    </Source>
                )}

                {/* TOURISTS */}
                {touristSource && (
                    <Source id="tourists" type="geojson" data={touristSource as any} cluster={true} clusterRadius={50}>
                        {loading && <Layer id="hidden" type="background" paint={{'background-opacity': 0}} />} 
                        {/* ^ Trick to ensure source is loaded */}
                        
                        {(layers.activeTourists || layers.inactiveTourists) && (
                           <>
                             <Layer
                                id="tourist-clusters"
                                type="circle"
                                filter={['has', 'point_count']}
                                paint={{
                                    'circle-color': '#3b82f6',
                                    'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25],
                                    'circle-opacity': 0.8,
                                    'circle-stroke-width': 2,
                                    'circle-stroke-color': '#fff'
                                }}
                            />
                            <Layer
                                id="tourist-cluster-count"
                                type="symbol"
                                filter={['has', 'point_count']}
                                layout={{
                                    'text-field': '{point_count_abbreviated}',
                                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                                    'text-size': 12
                                }}
                                paint={{ 'text-color': '#ffffff' }}
                            />
                            {/* Filter Active/Inactive based on Layer State */}
                            <Layer
                                id="tourist-circles"
                                type="circle"
                                filter={[
                                    'all',
                                    ['!', ['has', 'point_count']],
                                    ['match', ['get', 'status'],
                                        'active', layers.activeTourists,
                                        layers.inactiveTourists // default to inactive setting
                                    ]
                                ]}
                                paint={{
                                    'circle-color': ['match', ['get', 'status'], 'active', '#10b981', '#9ca3af'],
                                    'circle-radius': 5,
                                    'circle-stroke-width': 1,
                                    'circle-stroke-color': '#fff'
                                }}
                            />
                           </>
                        )}
                    </Source>
                )}

                {/* INCIDENTS */}
                {incidentSource && layers.incidents && (
                     <Source id="incidents" type="geojson" data={incidentSource as any}>
                        <Layer
                            id="incident-points"
                            type="circle"
                            paint={{
                                'circle-color': '#f97316', 
                                'circle-radius': 9,
                                'circle-stroke-width': 2,
                                'circle-stroke-color': '#fff'
                            }}
                        />
                     </Source>
                )}

                {/* SOS ALERTS */}
                {alertSource && layers.sos && (
                     <Source 
                        id="alerts" 
                        type="geojson" 
                        data={alertSource as any}
                        cluster={true}
                        clusterMaxZoom={14}
                        clusterRadius={40}
                     >
                        <Layer
                            id="alert-clusters"
                            type="circle"
                            filter={['has', 'point_count']}
                            paint={{
                                'circle-color': '#dc2626', 
                                'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 20, 30],
                                'circle-opacity': 0.9,
                                'circle-stroke-width': 3,
                                'circle-stroke-color': '#fee2e2'
                            }}
                        />
                         <Layer
                            id="alert-cluster-count"
                            type="symbol"
                            filter={['has', 'point_count']}
                            layout={{
                                'text-field': '{point_count_abbreviated}',
                                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                                'text-size': 14
                            }}
                            paint={{ 'text-color': '#ffffff' }}
                        />

                        {/* Unclustered Alerts - Sized by Priority */}
                        <Layer
                            id="alert-points"
                            type="circle"
                            filter={['!', ['has', 'point_count']]}
                            paint={{
                                'circle-color': '#ef4444',
                                'circle-radius': [
                                    'match', ['downcase', ['get', 'priority']],
                                    'critical', 14,
                                    'high', 11,
                                    9 // medium
                                ],
                                'circle-stroke-width': 2,
                                'circle-stroke-color': '#fff',
                                // Pulse effect simulation: Use a Halo or Opacity ramp (not animated here but visually distinct)
                                'circle-opacity': 1
                            }}
                        />
                        {/* Optional formatting for SOS label */}
                         <Layer
                             id="alert-labels"
                             type="symbol"
                             filter={['!', ['has', 'point_count']]}
                             layout={{
                                 'text-field': 'SOC',
                                 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 
                                 'text-size': 10,
                                 'text-offset': [0, -2] // Above marker
                             }}
                             paint={{
                                 'text-color': '#b91c1c',
                                 'text-halo-color': '#fff',
                                 'text-halo-width': 1
                             }}
                         />
                     </Source>
                )}

            </Map>

            {/* FLOATING LEGEND (Bottom Right) */}
            <div className="absolute bottom-6 right-12 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 text-xs z-10 max-w-[150px]">
                <h4 className="font-bold text-gray-700 mb-2">Map Legend</h4>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 shadow-sm animate-pulse"></div> SOS Alert</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Incident</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-red-200 border border-red-400"></div> Danger Zone</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Active Tourist</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400"></div> Inactive Tourist</div>
                </div>
            </div>


        </div>

        {/* Side Panel - Details */}
        <div className="space-y-6 overflow-y-auto h-full pr-2">
          {/* Details Panel - Content same as before but driven by selectedEntity */}
          {selectedEntity ? (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-in slide-in-from-right duration-200 sticky top-0">
                <button 
                  onClick={() => setSelectedEntity(null)}
                  className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                >
                    <X className="w-4 h-4" />
                </button>

                {selectedEntity.type === 'tourist' && (() => {
                   const tourist = data?.mapData.tourists.find(t => t.id === selectedEntity.id);
                   if(!tourist) return <div className="p-4 text-gray-500">Tourist not found</div>;
                   return (
                     <>
                         <div className="p-4 bg-blue-50 border-b border-gray-200 rounded-t-xl">
                             <h3 className="font-semibold text-gray-900">Tourist Details</h3>
                         </div>
                         <div className="p-4 space-y-3">
                             <div className="flex items-center justify-between">
                                 <span className="font-medium text-lg">{tourist.name}</span>
                                 <span className={`text-xs font-bold px-2 py-1 rounded-full ${tourist.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                                     {tourist.status.toUpperCase()}
                                 </span>
                             </div>
                             <div className="text-sm text-gray-600 space-y-2">
                                 <p className="flex justify-between"><span>Digital ID:</span> <span className="font-mono text-xs bg-gray-50 p-1 rounded">{tourist.id.substring(0,8)}...</span></p>
                                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                   <p className="text-xs uppercase text-gray-500 mb-1">Safety Score</p>
                                   <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div className="h-full bg-blue-600" style={{ width: `${tourist.safetyScore}%` }}></div>
                                      </div>
                                      <span className="font-bold text-blue-700">{tourist.safetyScore}</span>
                                   </div>
                                 </div>
                                 <p><strong>Location:</strong> {tourist.location.lat.toFixed(5)}, {tourist.location.lng.toFixed(5)}</p>
                             </div>
                             <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors mt-2 font-medium shadow-sm">
                                 View Full Profile
                             </button>
                         </div>
                     </>
                   );
                })()}

                {selectedEntity.type === 'alert' && (() => {
                    const alert = data?.mapData.activeAlerts.find(a => a.id === selectedEntity.id);
                    if(!alert) return <div className="p-4 text-gray-500">Alert not found</div>;
                    return (
                        <>
                          <div className="p-4 bg-red-50 border-b border-red-100 rounded-t-xl">
                             <h3 className="font-bold text-red-700 flex items-center gap-2">
                                 <AlertTriangle className="w-5 h-5" /> SOS ALERT
                             </h3>
                         </div>
                         <div className="p-4 space-y-4">
                              <div className="space-y-3 text-sm">
                                 <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                     <span className="text-gray-500">Status</span>
                                     <span className="capitalize font-medium px-2 py-0.5 bg-red-100 text-red-800 rounded">{alert.status}</span>
                                 </div>
                                 <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                     <span className="text-gray-500">Priority</span>
                                     <span className={`font-black ${alert.priority === 'high' ? 'text-red-600' : 'text-orange-600'}`}>{alert.priority.toUpperCase()}</span>
                                 </div>
                                 <div>
                                     <span className="text-gray-500 block mb-1">Location</span>
                                     <p className="font-medium text-gray-900">{alert.locationName || "Unknown Location"}</p>
                                     <p className="text-xs text-gray-400 mt-1">{alert.location.lat.toFixed(5)}, {alert.location.lng.toFixed(5)}</p>
                                 </div>
                             </div>
                             <button className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2.5 rounded-lg text-sm transition-colors font-bold shadow-md flex items-center justify-center gap-2">
                                 <RefreshCw className="w-4 h-4" /> Dispatch Response Unit
                             </button>
                         </div>
                        </>
                    )
                })()}

                {selectedEntity.type === 'incident' && (() => {
                  const incident = data?.mapData.incidents.find(i => i.id === selectedEntity.id);
                  if(!incident) return <div className="p-4 text-gray-500">Incident not found</div>;
                  return (
                     <>
                         <div className="p-4 bg-orange-50 border-b border-orange-100 rounded-t-xl">
                            <h3 className="font-semibold text-orange-800 flex items-center">
                               <AlertTriangle className="w-4 h-4 mr-2" /> Incident Report
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                             <h4 className="font-bold text-lg text-gray-900 leading-tight">{incident.title}</h4>
                             <div className="text-sm text-gray-600 space-y-2 mt-2">
                                <div className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-bold uppercase tracking-wider mb-2">
                                    {incident.category}
                                </div>
                                <p className="text-gray-500">Location coordinates: <br/>{incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}</p>
                            </div>
                        </div>
                     </>
                  )
               })()}
               
               {selectedEntity.type === 'zone' && (() => {
                  const zone = data?.mapData.zones.find(z => z.id === selectedEntity.id);
                  if(!zone) return <div className="p-4 text-gray-500">Zone not found</div>;
                  return (
                     <>
                          <div className="p-4 bg-red-50 border-b border-red-100 rounded-t-xl">
                             <h3 className="font-semibold text-gray-900">Danger Zone</h3>
                         </div>
                         <div className="p-4 space-y-3">
                              <h4 className="font-bold text-lg">{zone.name}</h4>
                               <div className="text-sm text-gray-600 space-y-1">
                                 <p><strong>Risk Level:</strong> <span className={zone.riskLevel === 'High' ? 'text-red-600 font-bold' : 'text-orange-500'}>{zone.riskLevel.toUpperCase()}</span></p>
                             </div>
                         </div>
                     </>
                  )
               })()}
             </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center h-48 flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <MapPin className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium mb-1">No Item Selected</h3>
                <p className="text-sm text-gray-500 px-4">Click on a map marker to view detailed information and take action.</p>
            </div>
          )}

          {/* Stats Cards (Below Details) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-200">
               <h3 className="font-semibold text-gray-900">Live Statistics</h3>
             </div>
             {data && (
             <div className="divide-y divide-gray-100">
               <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                 <span className="text-sm text-gray-600">Total Tourists</span>
                 <span className="font-bold text-gray-900 text-lg">{data.stats.totalTourists}</span>
               </div>
               <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                 <span className="text-sm text-gray-600">Active Alerts</span>
                 <span className="font-bold text-red-600 text-lg">{data.stats.activeAlerts}</span>
               </div>
               <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                 <span className="text-sm text-gray-600">High Risk Zones</span>
                 <span className="font-bold text-orange-600 text-lg">{data.stats.highRiskZones}</span>
               </div>
             </div>
             )}
          </div>

          {/* Map Layers (Moved to Right Side) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Map Layers</h3>
             </div>
             <div className="p-4 space-y-3">
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border border-transparent hover:border-gray-100">
                    <input type="checkbox" checked={layers.sos} onChange={() => toggleLayer('sos')} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"/>
                    <span className="flex-1 font-medium">SOS Alerts</span>
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border border-transparent hover:border-gray-100">
                    <input type="checkbox" checked={layers.incidents} onChange={() => toggleLayer('incidents')} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"/>
                    <span className="flex-1 font-medium">Incidents</span>
                    <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></div>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border border-transparent hover:border-gray-100">
                    <input type="checkbox" checked={layers.zones} onChange={() => toggleLayer('zones')} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"/>
                    <span className="flex-1 font-medium">Danger Zones</span>
                    <div className="w-3 h-3 rounded-md bg-red-200 border border-red-300"></div>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border border-transparent hover:border-gray-100">
                    <input type="checkbox" checked={layers.activeTourists} onChange={() => toggleLayer('activeTourists')} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"/>
                    <span className="flex-1 font-medium">Active Tourists</span>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border border-transparent hover:border-gray-100">
                    <input type="checkbox" checked={layers.inactiveTourists} onChange={() => toggleLayer('inactiveTourists')} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"/>
                    <span className="flex-1 font-medium">Inactive</span>
                    <div className="w-3 h-3 rounded-full bg-gray-400 shadow-sm"></div>
                </label>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouristMap;
