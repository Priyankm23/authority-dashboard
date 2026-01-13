import React, { useState, useEffect } from 'react';
import { 
  Users, 
  AlertTriangle, 
  MapPin, 
  Shield, 
  TrendingUp,
  FileText,
  Activity
} from 'lucide-react';
import { fetchDashboardStats, DashboardStats } from '../api/dashboard';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    // Poll every 30 seconds for updates
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to determine change direction for colors
  const getChangeType = (changeStr: string): 'up' | 'down' | 'neutral' => {
    if (!changeStr) return 'neutral';
    if (changeStr.startsWith('+')) return 'up';
    if (changeStr.startsWith('-') || changeStr.match(/^\d/) /* positive number without + */) return 'down'; 
    return 'neutral';
  };

  const short = (s?: string) => {
    if (!s) return '';
    if (s.length > 50) return s.slice(0, 47) + '...';
    return s;
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    change, 
    positiveTrend, // if true, 'up' is green. if false, 'up' is red (like for alerts)
    color 
  }: {
    icon: any;
    title: string;
    value: string | number;
    change?: string;
    positiveTrend?: boolean; // Does an increase mean something good?
    color: string;
  }) => {
    // Parse change direction
    const isUp = change?.includes('+');
    const isDown = change?.includes('-');
    
    // Determine color based on trend desirability
    // If positiveTrend is true: Up=Green, Down=Red
    // If positiveTrend is false (e.g. alerts): Up=Red, Down=Green
    
    let trendColor = 'text-gray-600';
    if (isUp) trendColor = positiveTrend ? 'text-green-600' : 'text-red-600';
    if (isDown) trendColor = positiveTrend ? 'text-red-600' : 'text-green-600';

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            {change && (
              <p className={`text-sm mt-2 flex items-center ${trendColor}`}>
                <TrendingUp className={`h-4 w-4 mr-1 ${isDown ? 'rotate-180' : ''}`} />
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
  };

  const getSeverityColor = (severity: string) => {
    const s = severity?.toLowerCase() || '';
    switch (s) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-red-50 text-red-700';
      case 'medium': return 'bg-yellow-50 text-yellow-700';
      case 'low': return 'bg-green-50 text-green-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'new': return 'bg-red-100 text-red-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress':
      case 'active': return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
      case 'closed': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-red-600">
        Failed to load dashboard data. Please try refreshing.
      </div>
    );
  }

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
          value={stats.activeTourists.count.toLocaleString()}
          change={stats.activeTourists.change}
          positiveTrend={true}
          color="bg-blue-500"
        />
        <StatCard
          icon={AlertTriangle}
          title="SOS Alerts Today"
          value={stats.sosAlertsToday.count}
          change={stats.sosAlertsToday.change}
          positiveTrend={false} // increase is bad
          color="bg-red-500"
        />
        <StatCard
          icon={MapPin}
          title="High-Risk Zones"
          value={stats.highRiskZones.count}
          positiveTrend={false}
          color="bg-orange-500"
        />
        <StatCard
          icon={Shield}
          title="Resolved Cases (This Month)"
          value={stats.resolvedCases.count}
          change={stats.resolvedCases.change}
          positiveTrend={true}
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
                {stats.recentAlerts.length} Active (Recent)
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recentAlerts.length === 0 ? (
                <p className="text-gray-500 text-center">No active alerts</p>
              ) : (
                stats.recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900 truncate mr-2">
                          {alert.touristName || 'Unknown Name'}
                          <span className="text-sm text-gray-500 font-normal ml-2">
                            {alert.touristId ? `(ID: ${alert.touristId})` : ''}
                          </span>
                        </p>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSeverityColor(alert.priority)} shrink-0`}> 
                          {alert.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.location}</p>
                      <p className="text-xs text-gray-500 mb-2">{alert.reason}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Tourist Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Tourist Status Overview</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.touristOverview.length === 0 ? (
                <p className="text-gray-500 text-center">No recent tourists found</p>
              ) : (
                stats.touristOverview.map((tourist) => (
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
                      <p className="text-sm text-gray-600 mb-1">
                         ID: {tourist.id}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Safety Score: {tourist.safetyScore}/100</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]" title={tourist.regTxHash}>
                          Block: {short(tourist.regTxHash) || 'Pending'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
