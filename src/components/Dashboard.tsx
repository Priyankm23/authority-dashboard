import React from 'react';
import { 
  Users, 
  AlertTriangle, 
  MapPin, 
  
  Shield, 
  TrendingUp,
  FileText,
  Activity
} from 'lucide-react';
import { mockMetrics, mockSOSAlerts, mockTourists } from '../utils/mockData';
import { fetchAlerts, subscribeToAlerts, unsubscribe as unsubscribeAlerts, Alert as ApiAlert } from '../api/alerts';
import { getHighRiskZoneCount } from '../api/geofence';
import { useState, useEffect } from 'react';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState(mockMetrics);
  const [highRiskZoneCount, setHighRiskZoneCount] = useState<number>(0);

  useEffect(() => {
    const fetchHighRiskCount = async () => {
      try {
        const count = await getHighRiskZoneCount();
        setHighRiskZoneCount(count);
      } catch (error) {
        console.error('Failed to fetch high risk zone count:', error);
      }
    };
    fetchHighRiskCount();
  }, []);

  type DisplayAlert = {
    id: string;
    touristName?: string;
    severity?: string;
    location?: { address?: string } | string;
    description?: string;
    status?: string;
    timestamp?: string;
  };
  const [alerts, setAlerts] = useState<DisplayAlert[] | null>(null);

  const mapEmergencyToSeverity = (reason: string | undefined) => {
    if (!reason) return 'unknown';
    const r = reason.toLowerCase();
    if (r.includes('cyclone') || r.includes('sos') || r.includes('urgent') || r.includes('help')) return 'critical';
    if (r.includes('silent')) return 'low';
    if (r.includes('fake')) return 'low';
    return 'medium';
  };

  // pretty-print nested objects (short) for description/address fallbacks
  const pretty = (v: any, max = 160) => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    try {
      const s = JSON.stringify(v, null, 2);
      return s.length > max ? s.slice(0, max - 3) + '...' : s;
    } catch (e) {
      return String(v);
    }
  };

  const normalizeRawAlert = (a: any): DisplayAlert => {
    const id = a.id || a._id || Math.random().toString(36).slice(2, 9);
    const touristName = a.touristName || a.tourist_name || (a.touristId ? `ID:${a.touristId}` : (a.tourist?.name || 'Unknown'));

    // location: prefer location.locationName, otherwise format coordinates
    let location: string | { address?: string } = '';
    if (!a.location) {
      if (a.address) location = { address: String(a.address) };
      else location = { address: 'Unknown' };
    } else if (typeof a.location === 'string') {
      location = a.location;
    } else if (a.location.locationName) {
      location = { address: String(a.location.locationName) };
    } else if (Array.isArray(a.location.coordinates) && a.location.coordinates.length >= 2) {
      // coordinates in backend are [lng, lat] per docs; we'll format as "lat, lng"
      const [lng, lat] = a.location.coordinates;
      location = { address: `${lat}, ${lng}` };
    } else {
      // fallback: pretty-print the whole object
      location = { address: pretty(a.location, 120) };
    }

    // description: prefer sosReason.reason or sosReason fields
    let description = '';
    if (a.sosReason) {
      if (typeof a.sosReason === 'string') description = a.sosReason;
      else if (a.sosReason.reason) description = String(a.sosReason.reason);
      else description = pretty(a.sosReason, 200);
    } else if (a.description) {
      description = typeof a.description === 'string' ? a.description : pretty(a.description, 200);
    }

    // severity: derive from sosReason.reason or explicit severity field
    const rawReason = (a.sosReason && (a.sosReason.reason || a.sosReason.type)) || a.emergencyType || a.severity || '';
    const severity = mapEmergencyToSeverity(String(rawReason));

    const status = a.status || 'unknown';
    const timestamp = a.timestamp || a.createdAt || new Date().toISOString();

    return {
      id,
      touristName,
      severity,
      location,
      description,
      status,
      timestamp
    };
  };

  // build list to render: normalize backend alerts when available, otherwise normalize mocks
  const displayAlerts: DisplayAlert[] = alerts ?? mockSOSAlerts.map(a => normalizeRawAlert(a));
  const recentAlerts = displayAlerts.slice(0, 3);
  const recentTourists = mockTourists.slice(0, 4);

  // fetch initial alerts and subscribe for updates
  React.useEffect(() => {
    let subId: string | null = null;
    let mounted = true;

    (async () => {
      try {
        const initial = await fetchAlerts();
        const normalized = initial.map((a: ApiAlert): DisplayAlert => normalizeRawAlert(a));
        if (mounted) setAlerts(normalized);
      } catch (e) {
        // keep mock alerts on error
        // eslint-disable-next-line no-console
        console.error('Failed to fetch initial alerts', e);
      }
    })();

    // subscribe for updates
    try {
      subId = subscribeToAlerts((newAlerts: ApiAlert[]) => {
        const normalized = newAlerts.map((a: ApiAlert): DisplayAlert => normalizeRawAlert(a));
        if (mounted) setAlerts(normalized);
      });
    } catch (e) {
      // ignore subscription errors
      // eslint-disable-next-line no-console
      console.error('Failed to subscribe to alerts', e);
    }

    return () => {
      mounted = false;
      if (subId) unsubscribeAlerts(subId);
    };
  }, []);

  const short = (s?: string) => {
    if (!s) return '';
    if (s.length > 120) return s.slice(0, 117) + '...';
    return s;
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    change, 
    changeType, 
    color 
  }: {
    icon: any;
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'up' | 'down';
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-2 flex items-center ${
              changeType === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${changeType === 'down' ? 'rotate-180' : ''}`} />
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>
    </div>
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-red-50 text-red-700';
      case 'medium': return 'bg-yellow-50 text-yellow-700';
      case 'low': return 'bg-green-50 text-green-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-red-100 text-red-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Real-time tourist safety monitoring and incident response</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0 text-sm text-gray-600">
          <Activity className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Active Tourists"
          value={metrics.activeTourists.toLocaleString()}
          change="+12% from yesterday"
          changeType="up"
          color="bg-blue-500"
        />
        <StatCard
          icon={AlertTriangle}
          title="SOS Alerts Today"
          value={displayAlerts.length}
          change="-3 from yesterday"
          changeType="down"
          color="bg-red-500"
        />
        <StatCard
          icon={MapPin}
          title="High-Risk Zones"
          value={highRiskZoneCount}
          color="bg-orange-500"
        />
        <StatCard
          icon={Shield}
          title="Resolved Cases (This Month)"
          value={metrics.resolvedCases}
          change="+25% from last month"
          changeType="up"
          color="bg-emerald-500"
        />
      </div>
      

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent SOS Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent SOS Alerts</h2>
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {recentAlerts.length} Active
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 truncate">{alert.touristName}</p>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSeverityColor(alert.severity || 'unknown')}`}> 
                        {(alert.severity || 'UNKNOWN').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{typeof alert.location === 'string' ? alert.location : (alert.location?.address || '')}</p>
                    <p className="text-xs text-gray-500 mb-2">{short(alert.description)}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(alert.status || 'unknown')}`}>
                        {(alert.status || 'unknown').replace('_', ' ').toUpperCase()
                      }</span>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Tourist Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Tourist Status Overview</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentTourists.map((tourist) => (
                <div key={tourist.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 truncate">{tourist.name}</p>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(tourist.status)}`}>
                        {tourist.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{tourist.country} • ID: {tourist.id}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Safety Score: {tourist.safetyScore}/100</p>
                      <p className="text-xs text-gray-500">
                        Last seen: {tourist.lastKnownLocation.address}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
            <AlertTriangle className="h-8 w-8 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Create New Alert</h3>
            <p className="text-sm text-gray-600">Manually create emergency alert</p>
          </button>
          <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors">
            <FileText className="h-8 w-8 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Generate E-FIR</h3>
            <p className="text-sm text-gray-600">Create incident report</p>
          </button>
          <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors">
            <MapPin className="h-8 w-8 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">View Live Map</h3>
            <p className="text-sm text-gray-600">Monitor tourist locations</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;