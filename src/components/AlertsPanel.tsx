import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Phone, 
  Send, 
  CheckCircle,
  Eye,
  Filter
} from 'lucide-react';
import { SOSAlert } from '../types';
import alertsApi from '../api/alerts';

// Helper: map backend alert (see apidocs.md) to frontend SOSAlert
const mapBackendToSOS = (a: any): SOSAlert => {
  // backend example fields: id, touristId, status, location: { coordinates: [lng, lat], locationName }, safetyScore, sosReason, emergencyContact, timestamp
  const coords = a.location && a.location.coordinates ? a.location.coordinates : [0, 0];
  const lng = coords[0];
  const lat = coords[1];

  // derive severity from safetyScore if provided
  const safety = typeof a.safetyScore === 'number' ? a.safetyScore : 50;
  let severity: SOSAlert['severity'] = 'medium';
  if (safety >= 80) severity = 'low';
  else if (safety >= 50) severity = 'medium';
  else if (safety >= 20) severity = 'high';
  else severity = 'critical';

  const sosReason = a.sosReason || {};
  // backend may have emergencyContact or emergencyContacts (array)
  const emergencyContact = a.emergencyContact || (Array.isArray(a.emergencyContacts) && a.emergencyContacts[0]) || {};

  // try to pick an emergencyType from reason text heuristically
  const reasonText = (sosReason.reason || '').toLowerCase();
  let emergencyType: SOSAlert['emergencyType'] = 'medical';
  if (reasonText.includes('cyclone') || reasonText.includes('flood') || reasonText.includes('earthquake') || reasonText.includes('storm')) {
    emergencyType = 'natural_disaster';
  } else if (reasonText.includes('accident')) {
    emergencyType = 'accident';
  } else if (reasonText.includes('attack') || reasonText.includes('robbery') || reasonText.includes('assault')) {
    emergencyType = 'crime';
  } else if (reasonText.includes('lost')) {
    emergencyType = 'lost';
  }

  const descriptionParts: string[] = [];
  if (sosReason.reason) descriptionParts.push(String(sosReason.reason));
  if (sosReason.weatherInfo) {
    // weatherInfo may be object or string
    descriptionParts.push(typeof sosReason.weatherInfo === 'string' ? sosReason.weatherInfo : JSON.stringify(sosReason.weatherInfo));
  }
  if (sosReason.extra) {
    descriptionParts.push(typeof sosReason.extra === 'string' ? sosReason.extra : JSON.stringify(sosReason.extra));
  }

  return {
    id: String(a._id || a.id),
    touristId: a.touristId || '',
    touristName: a.touristName || emergencyContact?.name || `Tourist ${a.touristId || ''}`,
    location: {
      lat: Number(lat) || 0,
      lng: Number(lng) || 0,
      address: a.location && a.location.locationName ? a.location.locationName : (a.location && a.location.address) || 'Unknown location'
    },
    emergencyType,
    severity,
    timestamp: a.timestamp || new Date().toISOString(),
    status: a.status || 'new',
    // assignedTo may be an array; show first or join
    assignedUnit: Array.isArray(a.assignedTo) ? (a.assignedTo.length ? String(a.assignedTo[0]) : undefined) : a.assignedUnit,
    contactInfo: emergencyContact?.phone || (Array.isArray(a.emergencyContacts) && a.emergencyContacts[0] && a.emergencyContacts[0].phone) || a.contactInfo || '',
    description: descriptionParts.join(' - '),
  } as SOSAlert;
};

const AlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'new' | 'assigned' | 'in_progress'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-red-100 text-red-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmergencyTypeIcon = (type: string) => {
    switch (type) {
      case 'medical': return '🏥';
      case 'accident': return '🚨';
      case 'crime': return '🚔';
      case 'lost': return '🗺️';
      case 'natural_disaster': return '⚠️';
      default: return '❓';
    }
  };

  const assignPoliceUnit = (alertId: string) => {
    const unitNumber = `Unit-${String(Math.floor(Math.random() * 20) + 1).padStart(3, '0')}`;
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'assigned' as const, assignedUnit: unitNumber }
        : alert
    ));
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' as const }
        : alert
    ));
  };

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(alert => alert.status === filter);
  const newAlertsCount = alerts.filter(alert => alert.status === 'new').length;

  useEffect(() => {
    let subId: string | null = null;

    const loadInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await alertsApi.fetchAlerts();
        const mapped = (Array.isArray(data) ? data : []).map(mapBackendToSOS);
        setAlerts(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    loadInitial();

    // subscribe to live updates
    try {
      subId = alertsApi.subscribeToAlerts((payload: any[]) => {
        try {
          const mapped = (Array.isArray(payload) ? payload : []).map(mapBackendToSOS);
          setAlerts(mapped);
        } catch (e) {
          // ignore mapping error
          // eslint-disable-next-line no-console
          console.error('Error mapping incoming alerts', e);
        }
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to subscribe to alerts, will rely on polling if available', e);
    }

    return () => {
      if (subId) alertsApi.unsubscribe(subId);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SOS Alerts & Emergency Response</h1>
          <p className="text-gray-600 mt-2">Real-time emergency alerts and incident management</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {newAlertsCount > 0 && (
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {newAlertsCount} New Alert{newAlertsCount > 1 ? 's' : ''}
            </div>
          )}
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <AlertTriangle className="h-4 w-4" />
            <span>Create Alert</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex space-x-2">
            {['all', 'new', 'assigned', 'in_progress'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab === 'all' ? 'All Alerts' : tab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {tab === 'new' && newAlertsCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                    {newAlertsCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Errors / Loading */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <strong className="block font-medium">Error loading alerts</strong>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="animate-pulse mx-auto h-10 w-10 bg-gray-200 rounded-full mb-4" />
          <p className="text-gray-600">Loading live SOS alerts…</p>
        </div>
      )}

      {/* Alerts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
            alert.status === 'new' ? 'border-red-200 bg-red-50/20' : 'border-gray-200'
          }`}>
            {/* Alert Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getEmergencyTypeIcon(alert.emergencyType)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{alert.touristName}</h3>
                    <p className="text-sm text-gray-600">ID: {alert.touristId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  {alert.status === 'new' && (
                    <div className="mt-1">
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                        NEW ALERT
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                  {alert.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Alert Details */}
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{alert.location.address}</p>
                    <p className="text-xs">Lat: {alert.location.lat}, Lng: {alert.location.lng}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-600">{alert.contactInfo}</p>
                </div>

                <div className="text-sm text-gray-600">
                  <p><strong>Emergency Type:</strong> {alert.emergencyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  <p className="mt-1">{alert.description}</p>
                </div>

                {alert.assignedUnit && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Assigned Unit:</strong> {alert.assignedUnit}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                {alert.status === 'new' && (
                  <>
                    <button
                      onClick={() => assignPoliceUnit(alert.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      <span>Assign Unit</span>
                    </button>
                    <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors">
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                  </>
                )}
                
                {(alert.status === 'assigned' || alert.status === 'in_progress') && (
                  <>
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Mark Resolved</span>
                    </button>
                    <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors">
                      <Phone className="h-4 w-4" />
                      <span>Contact Unit</span>
                    </button>
                  </>
                )}

                {alert.status === 'resolved' && (
                  <div className="w-full text-center text-green-600 font-medium py-2">
                    ✓ Case Resolved
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No emergency alerts at this time.' 
              : `No alerts with status "${filter.replace('_', ' ')}" found.`}
          </p>
        </div>
      )}

      {/* Emergency Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Emergency Response Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{alerts.filter(a => a.status === 'new').length}</p>
            <p className="text-sm text-red-700">New Alerts</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{alerts.filter(a => a.status === 'assigned').length}</p>
            <p className="text-sm text-blue-700">Assigned</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{alerts.filter(a => a.status === 'in_progress').length}</p>
            <p className="text-sm text-yellow-700">In Progress</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{alerts.filter(a => a.status === 'resolved').length}</p>
            <p className="text-sm text-green-700">Resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;