import { API_BASE_URL } from "../config";
const API_BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

export interface MapStats {
  totalTourists: number;
  activeAlerts: number;
  highRiskZones: number;
  responseUnits: number;
}

export interface MapTourist {
  id: string; // digitalId or touristId
  name: string;
  status: "active" | "expired";
  safetyScore: number;
  location: { lat: number; lng: number };
  type: "tourist";
}

export interface MapZone {
  id: string;
  name: string;
  riskLevel: string;
  type: "zone";
  shape: "circle" | "polygon";
  coordinates: [number, number]; // lat, lng center
  radius: number; // in meters
}

export interface MapAlert {
  id: string;
  type: "alert";
  status: string;
  priority: "high" | "medium" | "critical";
  location: { lat: number; lng: number };
  locationName?: string;
}

export interface MapRiskGrid {
  location: { lat: number; lng: number };
  intensity: number;
}

export interface MapIncident {
  id: string;
  title: string;
  type: "incident";
  category: string;
  location: { lat: number; lng: number };
}

export interface MapOverviewResponse {
  stats: MapStats;
  mapData: {
    tourists: MapTourist[];
    zones: MapZone[];
    activeAlerts: MapAlert[];
    riskGrids: MapRiskGrid[];
    incidents: MapIncident[];
  };
}

export async function fetchMapOverview(): Promise<MapOverviewResponse> {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    Object.assign(headers, { Authorization: `Bearer ${token}` });
  }

  const res = await fetch(`${API_BASE}/api/authority/map-overview`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch map data: ${res.status}`);
  }

  const json = await res.json();
  if (json.success) {
    return json as MapOverviewResponse;
  }
  throw new Error(json.message || "Failed to load map overview");
}
