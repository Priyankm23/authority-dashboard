const DEFAULT_BASE = 'https://smart-tourist-safety-backend.onrender.com';
const API_BASE =  DEFAULT_BASE;

export interface RecentAlert {
  id: string;
  touristId?: string;
  touristName?: string;
  location: string;
  status: string;
  timestamp: string;
  reason: string;
  priority: string;
  isNew: boolean;
}

export interface TouristOverview {
  id: string;
  name: string;
  safetyScore: number;
  status: string;
  regTxHash: string;
}

export interface DashboardStats {
  activeTourists: {
    count: number;
    change: string;
  };
  sosAlertsToday: {
    count: number;
    change: string;
  };
  highRiskZones: {
    count: number;
  };
  resolvedCases: {
    count: number;
    change: string;
  };
  recentAlerts: RecentAlert[];
  touristOverview: TouristOverview[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  // Assuming the route is mounted under /api/authority like other authority routes
  const res = await fetch(`${API_BASE}/api/authority/dashboard-stats`, {
    headers: {
      'Content-Type': 'application/json',
      // Include authorization header if token exists in localStorage
      ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard stats: ${res.status}`);
  }

  const json = await res.json();
  if (json.success && json.data) {
    return json.data as DashboardStats;
  }
  
  throw new Error('Invalid response format');
}
