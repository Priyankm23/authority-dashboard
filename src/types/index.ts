export interface User {
  id: string;
  name: string;
  email: string;
  role: 'police' | 'tourism' | 'admin';
  department: string;
}

export interface Tourist {
  id: string;
  name: string;
  govIdHash: string;
  country: string;
  phoneNumber: string;
  emergencyContact: string;
  tripValidFrom: string;
  tripValidTo: string;
  safetyScore: number;
  status: 'active' | 'expired' | 'revoked';
  lastKnownLocation: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  travelItinerary: string[];
}

export interface SOSAlert {
  id: string;
  touristId: string;
  touristName: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  emergencyType: 'medical' | 'accident' | 'crime' | 'lost' | 'natural_disaster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  safetyScore?: number;
  timestamp: string;
  status: 'new' | 'assigned' | 'in_progress' | 'resolved';
  assignedUnit?: string;
  contactInfo: string;
  description: string;
  emergencyContactName?: string;
  isLoggedOnChain?: boolean;
}

export interface DashboardMetrics {
  activeTourists: number;
  sosToday: number;
  highRiskZones: number;
  expiredIds: number;
  resolvedCases: number;
  responseTime: string;
}