import React, { useEffect, useState } from 'react';
import { SOSAlert } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { X, MapPin, Phone, User, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatPhoneNumber, formatSOSReason, getSeverityFromScore, getSeverityColors } from '../utils/formatters';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AlertDetailViewProps {
  alert: SOSAlert;
  onClose: () => void;
  onRespond: (alert: SOSAlert) => void;
  onMarkFalseAlarm?: (alert: SOSAlert) => void;
}

export const AlertDetailView: React.FC<AlertDetailViewProps> = ({
  alert,
  onClose,
  onRespond,
  onMarkFalseAlarm,
}) => {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [optimisticEndTime, setOptimisticEndTime] = useState<number | null>(null);
  
  // Calculate elapsed time
  useEffect(() => {
    // If already assigned/resolved/responding or we have an optimistic click time
    const isFinished = alert.status === 'assigned' || alert.status === 'responding' || alert.status === 'resolved';
    const endTime = isFinished && alert.responseDate 
      ? new Date(alert.responseDate).getTime() 
      : optimisticEndTime;

    if (endTime) {
      const start = new Date(alert.timestamp).getTime();
      const diff = Math.floor((endTime - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
      return;
    }
    
    // Otherwise run live timer
    const startTime = new Date(alert.timestamp).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [alert.timestamp, alert.status, alert.responseDate, optimisticEndTime]);
  
  const reason = formatSOSReason(alert.sosReason);
  const locationName = alert.locationName || alert.location?.locationName || alert.location?.address || 'Unknown Location';
  const lat = alert.location?.lat || alert.location?.coordinates?.[1] || 0;
  const lng = alert.location?.lng || alert.location?.coordinates?.[0] || 0;
  
  // Severity badge color - using new palette
  const severity = alert.severity || getSeverityFromScore(alert.safetyScore || 50);
  const severityColors = getSeverityColors(severity);
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Dashboard</span>
            <span>›</span>
            <span>Alerts</span>
            <span>›</span>
            <span className="text-gray-900 font-medium">{alert.alertId || alert.id}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-semibold">LIVE FEED CONNECTED</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alert Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${severityColors.bg} ${severityColors.text}`}>
                  🚨 {severity}
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded text-xs font-bold uppercase text-gray-700">
                  Status: {alert.status || 'Active'}
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded text-xs font-bold uppercase text-gray-700">
                  Score: {alert.safetyScore ?? 'N/A'}
                </span>
                <span className="text-sm text-gray-600 border-l border-gray-300 pl-3">
                  ID: {alert.alertId || alert.id}
                </span>
                <span className="text-sm text-gray-600 border-l border-gray-300 pl-3">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{reason.toUpperCase()}</h1>
              <p className="text-gray-600">
                Tourist reported {reason} and location is {locationName}.
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase mb-1">Response Time Elapsed</div>
              <div className="text-3xl font-bold text-red-600 tabular-nums">{elapsedTime}</div>
              <div className="text-xs text-gray-500 mt-1">
                <span>HRS</span>
                <span className="ml-4">MIN</span>
                <span className="ml-4">SEC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Tourist Info */}
            <div className="space-y-4">
              {/* Tourist Information Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-gray-700" />
                  <h2 className="font-bold text-gray-900">Tourist Information</h2>
                  <h2 className="font-bold text-gray-900">Tourist Information</h2>
                </div>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                    <User className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{alert.touristName}</h3>
                    <div className="text-sm text-gray-600">{alert.nationality || 'Unknown'}</div>
                    {alert.touristId && (
                      <div className="text-xs text-gray-500 mt-1">Pass: {alert.touristId}</div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">Age / Gender</div>
                    <div className="font-semibold">{alert.age || 'N/A'} / {alert.gender || 'Unknown'}</div>
                  </div>
                  {/* Gov ID removed as per request */}
                </div>
              </div>

              {/* Medical Alert */}
              {(alert.medicalConditions || alert.allergies || alert.bloodGroup) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-red-600" />
                    <h2 className="font-bold text-red-900">MEDICAL INFO</h2>
                  </div>
                  <div className="text-sm text-red-800 space-y-1">
                    {alert.bloodGroup && <div>Blood Type: <span className="font-bold">{alert.bloodGroup}</span></div>}
                    {alert.medicalConditions && <div>{alert.medicalConditions}</div>}
                    {alert.allergies && <div>Allergies: {alert.allergies}</div>}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
             <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-5 h-5 text-gray-700" />
                  <h2 className="font-bold text-gray-900">Emergency Contact</h2>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">Tourist Mobile</div>
                    <a
                      href={`tel:${alert.phone || alert.emergencyContact?.phone}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <Phone className="w-4 h-4" />
                      {formatPhoneNumber(alert.phone || alert.emergencyContact?.phone || 'N/A')}
                    </a>
                  </div>
                  
                  {alert.emergencyContact && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500 uppercase mb-1">
                        Emergency Contact ({alert.emergencyContact.relation || 'Family'})
                      </div>
                      <div className="font-semibold text-gray-900 mb-1">
                        {alert.emergencyContact.name}
                      </div>
                      <a
                        href={`tel:${alert.emergencyContact.phone}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Phone className="w-4 h-4" />
                        {formatPhoneNumber(alert.emergencyContact.phone)}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Map */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="h-96 relative">
                  {lat !== 0 && lng !== 0 ? (
                    <MapContainer
                      center={[lat, lng]}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                      className="z-0"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[lat, lng]}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-bold">{alert.touristName}</div>
                            <div>{locationName}</div>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <div className="text-center text-gray-500">
                        <MapPin className="w-12 h-12 mx-auto mb-2" />
                        <div>Location unavailable</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                      <span className="text-xs font-bold">SOS LOCATION</span>
                    </div>
                    <div className="text-xs text-gray-600">±5m Accuracy</div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-start gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900">{locationName}</div>
                      <div className="text-sm text-gray-600">
                        {lat.toFixed(6)}° N, {lng.toFixed(6)}° E
                      </div>
                      <div className="text-xs text-gray-500">Srinagar, J&K</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
                      className="flex-1 px-3 py-2 border border-gray-300 hover:bg-gray-50 rounded text-sm font-medium text-gray-700"
                    >
                      Open in Maps
                    </button>
                    <button className="flex-1 px-3 py-2 border border-gray-300 hover:bg-gray-50 rounded text-sm font-medium text-gray-700">
                      Route to Unit
                    </button>
                  </div>
                </div>
              </div>


            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-center gap-4">
            {onMarkFalseAlarm && !['assigned', 'responding', 'resolved'].includes(alert.status) && (
              <button
                onClick={() => onMarkFalseAlarm(alert)}
                className="px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-bold text-gray-700 transition-colors"
              >
                MARK FALSE ALARM
              </button>
            )}
            
            {(alert.status === 'assigned' || alert.status === 'responding') ? (
               <button
                 onClick={() => onRespond(alert)}
                 className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-colors shadow-lg"
               >
                 <CheckCircle className="w-5 h-5" />
                 RESOLVE ALERT
               </button>
            ) : alert.status !== 'resolved' && (
              <button
                onClick={() => {
                  setOptimisticEndTime(Date.now());
                  onRespond(alert);
                }}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-colors shadow-lg"
              >
                <AlertTriangle className="w-5 h-5" />
                RESPOND NOW
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
