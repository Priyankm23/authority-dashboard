import React, { useState, useEffect } from 'react';
import { 
  Users, 
  AlertTriangle, 
  MapPin, 
  Shield, 
  TrendingUp,
  FileText,
  Activity,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
  LabelList,
  BarChart,
  Bar,
} from "recharts";
import { fetchDashboardStats, DashboardStats } from '../api/dashboard';


const Dashboard: React.FC = () => {
  // Original Dashboard State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-Time Ops Data from Stats
  const analytics = stats?.analytics;
  const avgResponse = analytics?.responseAnalysis?.avgTimeMinutes || parseFloat(analytics?.responseAnalysis?.avgTime || '0') || 0;
  const utilPercent = analytics?.unitUtilization?.percent || 0;
  
  // Charts Data - convert from seconds to minutes
  // Backend sends samples newest-first, so first element is T-0 (latest)
  const chartSeries = (analytics?.responseAnalysis?.samples || [])
    .map((val, i) => ({
      time: `T-${i}`,
      responseTime: val / 60  // Convert seconds to minutes
  }));

  const incidentSeverities = analytics?.incidentAnalysis?.severityBreakdown || { critical:0, high:0, medium:0, low:0 };
  const severityData = Object.keys(incidentSeverities).map(k => ({
      severity: k,
      count: (incidentSeverities as any)[k] || 0
  }));

  const liveIncidents = (analytics?.incidentAnalysis?.recentStream || []).slice(0, 5);
  const patterns = Object.values(analytics?.patterns || {});
  const predictions = analytics?.predictions || { crowdSurge: 'N/A', riskForecast: 'N/A', proactiveDeployment: 'N/A' };
  // Fetch Original Dashboard Stats
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
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    change, 
    trend, // 'up' | 'down' | 'neutral'
    sentiment, // 'positive' | 'negative' | 'neutral'
    isPrimary = false,
    helperText
  }: any) => {
    // Semantic Colors System
    const getColors = () => {
       if (isPrimary) return {
         bg: 'bg-red-500', 
         text: 'text-white', 
         subtext: 'text-red-100', 
         iconBg: 'bg-red-600',
         iconColor: 'text-white'
       };
       
       // Default styling based on sentiment of the metric
       return {
         bg: 'bg-white',
         text: 'text-gray-900',
         subtext: 'text-gray-500',
         iconBg: 'bg-gray-50',
         iconColor: 'text-gray-500' // Default
       };
    };

    const colors = getColors();
    const isPositive = sentiment === 'positive';
    const isNegative = sentiment === 'negative';
    
    // Trend Badge Colors
    let badgeColor = 'bg-gray-100 text-gray-600';
    if (trend === 'up' && isPositive) badgeColor = 'bg-green-100 text-green-700';
    if (trend === 'down' && isNegative) badgeColor = 'bg-green-100 text-green-700'; // Decreasing bad thing is good
    if (trend === 'up' && isNegative) badgeColor = 'bg-red-100 text-red-700'; // Increasing bad thing is bad
    if (trend === 'down' && isPositive) badgeColor = 'bg-red-100 text-red-700'; // Decreasing good thing is bad

    return (
      <div className={`relative overflow-hidden rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${colors.bg} ${isPrimary ? 'col-span-12 md:col-span-6 lg:col-span-4 lg:row-span-2' : 'col-span-12 md:col-span-6 lg:col-span-2'}`}>
        <div className="p-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                  <Icon className={`h-6 w-6 ${colors.iconColor}`} />
                </div>
                 {change && (
                  <div className={`flex items-center px-2 py-1 rounded-lg text-xs font-bold ${isPrimary ? 'bg-red-600 text-white' : badgeColor}`}>
                    {trend === 'up' ? '▲' : '▼'} {change}
                  </div>
                )}
            </div>
            
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${colors.subtext}`}>{title}</p>
              <h3 className={`font-bold tracking-tight mb-1 ${isPrimary ? 'text-4xl' : 'text-3xl'} ${colors.text}`}>
                {value}
              </h3>
              {helperText && (
                 <p className={`text-xs ${isPrimary ? 'text-red-100' : 'text-gray-400'}`}>{helperText}</p>
              )}
            </div>
        </div>
      </div>
    );
  };

  const getSeverityColor = (severity: string) => {
    const s = severity?.toLowerCase() || '';
    switch (s) {
      case 'critical': return 'bg-red-50 text-red-700 border border-red-100';
      case 'high': return 'bg-orange-50 text-orange-700 border border-orange-100';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border border-yellow-100';
      case 'low': return 'bg-blue-50 text-blue-700 border border-blue-100';
      default: return 'bg-gray-50 text-gray-600 border border-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-10 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-gray-500">
        <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p>Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 bg-gray-50/30 p-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Authority Command Center</h1>
          <p className="text-gray-500 text-sm">Overview of tourist safety operations</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
           <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
             <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Live Stream</span>
           </div>
        </div>
      </div>

      {/* --- SECTION 1: OVERVIEW & KPIs --- */}
      <section>
          <div className="grid grid-cols-12 gap-6">
            {/* Primary KPI: SOS Alerts */}
            <StatCard
              icon={AlertTriangle}
              title="SOS Alerts Today"
              value={stats.sosAlertsToday.count}
              change={stats.sosAlertsToday.change}
              trend="up" // Assuming increase is bad, will fix logic if needed based on data
              sentiment="negative"
              isPrimary={true}
              helperText="Requires immediate attention"
            />
            
            {/* Secondary KPIs */}
            <StatCard
              icon={Clock}
              title="Avg Response Time"
              value={`${avgResponse.toFixed(1)}m`}
              change="-12%"
              trend="down"
              sentiment="positive"
              helperText="Below 15m SLA target"
            />
             <StatCard
              icon={Users}
              title="Active Tourists"
              value={stats.activeTourists.count.toLocaleString()}
              change={stats.activeTourists.change}
              trend="up"
              sentiment="positive"
              helperText="24h active count"
            />
            
            <StatCard
              icon={Activity}
              title="Unit Utilization"
              value={`${utilPercent}%`}
              change="+5%"
              trend="up"
              sentiment="negative" // High utilization -> Overload risk
              helperText="12 units currently engaged"
            />
             <StatCard
              icon={Shield}
              title="Resolved Cases"
              value={stats.resolvedCases.count}
              change={stats.resolvedCases.change}
              trend="up"
              sentiment="positive"
              helperText="vs. 12 yesterday"
            />
          </div>
      </section>

      {/* --- SECTION 2: OPERATIONS & ANALYTICS --- */}
      <section className="grid grid-cols-12 gap-6">
          {/* Charts Column (Left - 8 cols) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Response Trend */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                        <h4 className="font-bold text-gray-900">Response Time Trend</h4>
                        <p className="text-xs text-gray-500">Real-time performance vs SLA (15m)</p>
                    </div>
                     <div className="flex items-center space-x-2 text-xs">
                        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span> Actual</span>
                        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-400 mr-1"></span> SLA Limit</span>
                     </div>
                  </div>
                  
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                        <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                        itemStyle={{color: '#111827', fontSize: '12px', fontWeight: 600}}
                        cursor={{stroke: '#E5E7EB', strokeWidth: 1}}
                        labelStyle={{color: '#6B7280', marginBottom: '0.25rem', fontSize: '10px', textTransform: 'uppercase'}}
                        />
                        <ReferenceLine y={15} stroke="#EF4444" strokeDasharray="3 3">
                             <Label value="SLA Threshold (15m)" position="insideTopRight" fill="#EF4444" fontSize={10} />
                        </ReferenceLine>
                        <Line 
                            type="monotone" 
                            dataKey="responseTime" 
                            stroke="#3B82F6" 
                            strokeWidth={3} 
                            dot={{r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff'}} 
                            activeDot={{r: 6, strokeWidth: 0}} 
                        />
                    </LineChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Secondary Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Predictive Insights Panel */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
                 <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                       <TrendingUp className="h-5 w-5 text-indigo-700" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-base">Predictive Intel</h4>
                        <p className="text-xs text-gray-500">AI-driven safety forecasting</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                     {/* Pattern Items */}
                     {predictions.crowdSurge !== 'N/A' && (
                        <div className="flex flex-col p-4 bg-blue-50/50 rounded-xl border border-blue-100 transition-all hover:bg-blue-50">
                             <div className="flex items-center space-x-2 mb-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Crowd Risk</span>
                             </div>
                             <p className="text-sm font-semibold text-blue-900 leading-snug">{predictions.crowdSurge}</p>
                        </div>
                     )}
                     
                      {predictions.riskForecast !== 'N/A' && (
                        <div className="flex flex-col p-4 bg-orange-50/50 rounded-xl border border-orange-100 transition-all hover:bg-orange-50">
                             <div className="flex items-center space-x-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Forecast</span>
                             </div>
                             <p className="text-sm font-semibold text-orange-900 leading-snug">{predictions.riskForecast}</p>
                        </div>
                     )}
                     
                     {patterns.length > 0 && (
                        <div className="pt-5 mt-2 border-t border-gray-100">
                             <div className="flex items-center space-x-2 mb-3">
                                 <Activity className="h-4 w-4 text-gray-400" />
                                 <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Detected Patterns</h5>
                             </div>
                             <ul className="space-y-3">
                                {patterns.slice(0, 3).map((p: any, idx) => (
                                    <li key={idx} className="text-sm text-gray-600 flex items-start group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 mr-3 shrink-0 group-hover:bg-indigo-600 transition-colors"></div>
                                        <span className="leading-relaxed">{p}</span>
                                    </li>
                                ))}
                             </ul>
                        </div>
                     )}
                 </div>
             </div>

                  {/* Incident Severity Bar */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                       <h4 className="font-bold text-gray-900 mb-1">Incident Severity</h4>
                       <p className="text-xs text-gray-500 mb-6">Volume by risk level</p>

                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={severityData} barSize={32} margin={{top: 20}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis 
                                dataKey="severity" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#6B7280', fontWeight: 600}} 
                                dy={10}
                            />
                            <YAxis hide />
                            <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {severityData.map((entry, index) => {
                                    let fill = '#9CA3AF';
                                    if(entry.severity === 'critical') fill = '#EF4444';
                                    if(entry.severity === 'high') fill = '#F97316';
                                    if(entry.severity === 'medium') fill = '#EAB308';
                                    if(entry.severity === 'low') fill = '#3B82F6';
                                    return <Cell key={`cell-${index}`} fill={fill} />;
                                })}
                                <LabelList dataKey="count" position="top" fill="#374151" fontSize={12} fontWeight="bold" />
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>

          {/* Intelligence Column (Right - 4 cols) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
             
             {/* Live Incident Feed */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full max-h-[600px]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                  <div className="flex items-center space-x-2">
                     <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                     </div>
                     <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Action Feed</h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">{liveIncidents.length} Active</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                   {liveIncidents.length === 0 ? (
                       <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                           <Shield className="h-10 w-10 mb-3 opacity-20" />
                           <p className="text-sm">All Quiet</p>
                       </div>
                   ) : (
                       liveIncidents.map((i, idx) => (
                           <div key={i.id} className={`p-4 rounded-xl border transition-all ${idx === 0 ? 'bg-red-50/30 border-red-100 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-2">
                                     <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getSeverityColor(i.severity)}`}>{i.severity}</span>
                                     <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[120px]" title={i.title}>{i.title}</h4>
                                  </div>
                                  <span className="text-xs text-gray-400 font-mono">{new Date(i.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               </div>
                               
                               <div className="flex items-center text-xs text-gray-500 mb-3">
                                   <MapPin className="h-3 w-3 mr-1" />
                                   {i.location ? `Lat: ${i.location.lat.toFixed(4)}` : 'Unknown Location'} • Area 4
                               </div>
                               
                               <div className="grid grid-cols-2 gap-2 mt-2">
                                   <button className="flex items-center justify-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                                       Assign Unit
                                   </button>
                                   <button className="flex items-center justify-center px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                                       View Map
                                   </button>
                               </div>
                           </div>
                       ))
                   )}
                </div>
             </div>


          </div>
      </section>




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
