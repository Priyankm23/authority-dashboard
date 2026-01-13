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
import { useToast } from './ToastProvider';

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
      address: a.locationName || (a.location && a.location.locationName) || (a.location && a.location.address) || 'Unknown location'
    },
    emergencyType,
    severity,
    timestamp: a.timestamp || new Date().toISOString(),
    status: a.status || 'new',
    // assignedTo may be an array; show first or join
    assignedUnit: Array.isArray(a.assignedTo) ? (a.assignedTo.length ? String(a.assignedTo[0]) : undefined) : a.assignedUnit,
    contactInfo: emergencyContact?.phone || (Array.isArray(a.emergencyContacts) && a.emergencyContacts[0] && a.emergencyContacts[0].phone) || a.contactInfo || '',
    description: descriptionParts.join(' - '),
    emergencyContactName: emergencyContact?.name || (Array.isArray(a.emergencyContacts) && a.emergencyContacts[0] && a.emergencyContacts[0].name) || '',
    isLoggedOnChain: a.isLoggedOnChain === true,
    safetyScore: safety
  } as SOSAlert;
};

const AlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'assigned' | 'in_progress'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

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

  const assignPoliceUnit = async (alertId: string) => {
    try {
      await alertsApi.assignUnit(alertId);
      showToast('Unit assigned successfully', 'success');
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'assigned' as const, assignedUnit: 'Assigned' } 
          : alert
      ));
    } catch (err: any) {
      console.error('Failed to assign unit:', err);
      showToast(err.message || 'Failed to assign unit', 'error');
    }
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
          <div key={alert.id} className={`bg-white rounded-xl shadow border transition-all duration-200 hover:shadow-lg ${
            alert.status === 'new' ? 'border-red-200 bg-red-50/20' : 'border-gray-200'
          }`}>
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl filter drop-shadow-sm">{getEmergencyTypeIcon(alert.emergencyType)}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{alert.touristName}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      {alert.status === 'new' && (
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                          NEW
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600 mb-5">
                <div className="flex items-center space-x-2.5">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="truncate text-gray-700">{alert.location.address}</span>
                </div>
                <div className="flex items-center space-x-2.5">
                   <Phone className="h-4 w-4 text-gray-500" />
                   <span className="text-gray-700">{alert.contactInfo}</span>
                </div>
                <div className="flex items-center space-x-2.5">
                   <AlertTriangle className="h-4 w-4 text-gray-500" />
                   <span className="capitalize text-gray-700">{alert.emergencyType.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {alert.status === 'new' ? (
                  <button
                    onClick={() => assignPoliceUnit(alert.id)}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Assign Unit
                  </button>
                ) : (
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    disabled={alert.status === 'resolved'}
                    className={`flex items-center justify-center py-2 px-4 rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95 ${
                      alert.status === 'resolved' 
                        ? 'bg-green-100 text-green-700 cursor-default' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {alert.status === 'resolved' ? 'Resolved' : 'Resolve'}
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition-all"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200 scale-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">SOS Alert Details</h2>
                    <p className="text-sm text-gray-500 mt-0.5">ID: {selectedAlert.id} {selectedAlert.isLoggedOnChain && <span className="ml-2 inline-flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium">🔗 Blockchain Verified</span>}</p>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <span className="text-2xl leading-none">&times;</span>
                </button>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Sender Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tourist Name</label>
                        <p className="font-semibold text-gray-900 text-lg mt-1">{selectedAlert.touristName}</p>
                    </div>
                     <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tourist ID</label>
                        <p className="font-mono text-sm text-gray-700 mt-1">{selectedAlert.touristId}</p>
                    </div>
                     <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blockchain Status</label>
                         <div className="mt-1 flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${selectedAlert.isLoggedOnChain ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className={`font-medium ${selectedAlert.isLoggedOnChain ? 'text-green-700' : 'text-gray-500'}`}>
                                {selectedAlert.isLoggedOnChain ? 'Verified & Logged' : 'Not Logged'}
                            </span>
                         </div>
                    </div>
                     <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Safety Score</label>
                        <div className="mt-1 flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gray-900">{selectedAlert.safetyScore || 'N/A'}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${getSeverityColor(selectedAlert.severity)}`}>
                                {selectedAlert.severity.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Emergency Info */}
                <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center text-lg">
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-500"/> Emergency Context
                    </h3>
                    <div className="space-y-4">
                         <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-500 w-24">Type:</span>
                            <span className="font-medium text-gray-900 capitalize px-3 py-1 bg-gray-100 rounded-full text-sm">{selectedAlert.emergencyType.replace('_', ' ')}</span>
                         </div>
                         <div>
                             <span className="text-sm font-medium text-gray-500 mb-2 block">Reported Reason:</span>
                             <div className="p-4 bg-red-50 text-red-900 rounded-lg text-sm border border-red-100 leading-relaxed">
                                {selectedAlert.description || "No specific reason provided."}
                             </div>
                         </div>
                    </div>
                </div>

                {/* Contact Info */}
                 <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center text-lg">
                        <Phone className="h-5 w-5 mr-2 text-blue-500"/> Contact & Location
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                             <label className="text-xs font-semibold text-gray-500 uppercase">Emergency Contact</label>
                             <p className="font-semibold text-gray-900 mt-1 text-lg">{selectedAlert.emergencyContactName || "N/A"}</p>
                             <p className="text-sm text-gray-600 flex items-center mt-1">
                                <Phone className="h-3 w-3 mr-1"/> {selectedAlert.contactInfo}
                             </p>
                        </div>
                         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                             <label className="text-xs font-semibold text-gray-500 uppercase">Current Location</label>
                             <p className="font-medium text-gray-900 mt-1">{selectedAlert.location.address}</p>
                             <p className="text-xs font-mono text-gray-500 mt-2 bg-white px-2 py-1 rounded border border-gray-200 inline-block">
                                {selectedAlert.location.lat.toFixed(6)}, {selectedAlert.location.lng.toFixed(6)}
                             </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-gray-50/80 rounded-b-2xl border-t border-gray-200 flex justify-end">
                <button onClick={() => setSelectedAlert(null)} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 shadow-sm transition-all active:scale-95">
                    Close Details
                </button>
            </div>
          </div>
        </div>
      )}

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