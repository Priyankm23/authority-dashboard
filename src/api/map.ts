import { API_BASE_URL, PATH_DEVIATION_API_BASE_URL } from "../config";
const API_BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;
const PATH_DEVIATION_API_BASE =
  import.meta.env.VITE_PATH_DEVIATION_API_BASE ||
  PATH_DEVIATION_API_BASE_URL;

console.info('[map.ts] Using PATH_DEVIATION_API_BASE:', PATH_DEVIATION_API_BASE);

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

// Styled Zones Types
export interface VisualStyle {
  zoneType: "danger_zone" | "risk_grid" | "geofence";
  borderStyle: "solid" | "dashed" | "dotted";
  borderWidth: number;
  fillOpacity: number;
  fillPattern: string;
  iconType: string;
  renderPriority: number;
  gridSize?: number;
  color?: string;
}

export interface DangerZone {
  _id: string;
  name: string;
  type: string;
  coords: [number, number];
  radiusKm?: number;
  polygonCoords?: [number, number][];
  category?: string;
  state?: string;
  riskLevel: string;
  visualStyle: VisualStyle;
}

export interface RiskGrid {
  _id: string;
  gridId: string;
  gridName: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  riskScore: number;
  riskLevel: string;
  lastUpdated: string;
  reasons?: Array<{
    type: "sos_alert" | "incident";
    title: string;
    severity: number;
    timestamp: string;
  }>;
  visualStyle: VisualStyle;
}

export interface StyledZonesResponse {
  dangerZones: DangerZone[];
  riskGrids: RiskGrid[];
  geofences: any[]; // We won't use these
}

export interface SafetyLatestUser {
  userId: string;
  location: { lat: number; lng: number };
  timestamp: string;
  activeZoneCount: number;
  safetyScore: number;
}

export interface SafetyLatestUsersResponse {
  users: SafetyLatestUser[];
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

export async function fetchStyledZones(): Promise<StyledZonesResponse> {
  const res = await fetch(`${API_BASE}/api/geofence/all-zones-styled`);

  if (!res.ok) {
    throw new Error(`Failed to fetch styled zones: ${res.status}`);
  }

  const json = await res.json();
  return json as StyledZonesResponse;
}

export async function fetchLatestSafetyUsers(): Promise<SafetyLatestUser[]> {
  const url = `${PATH_DEVIATION_API_BASE}/safety/users/latest?minutes=1440&limit=1000`;
  console.info('[fetchLatestSafetyUsers] Fetching from:', url);

  const res = await fetch(url);
  if (!res.ok) {
    console.error('[fetchLatestSafetyUsers] Request failed:', res.status, res.statusText);
    throw new Error(`Failed to fetch safety latest users: ${res.status}`);
  }

  const json = (await res.json()) as SafetyLatestUsersResponse & {
    users?: any[];
  };

  if (!Array.isArray(json.users)) {
    return [];
  }

  const normalized: SafetyLatestUser[] = [];

  for (const row of json.users) {
    const userId = String(row?.userId || row?.touristId || row?.id || "");
    const lat = Number(
      row?.location?.lat ?? row?.latitude ?? row?.latestLocation?.lat,
    );
    const lng = Number(
      row?.location?.lng ?? row?.longitude ?? row?.latestLocation?.lng,
    );
    const safetyScore = Number(row?.safetyScore ?? row?.score ?? 0);

    if (!userId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    normalized.push({
      userId,
      location: { lat, lng },
      timestamp: String(row?.timestamp || row?.updatedAt || new Date().toISOString()),
      activeZoneCount: Number(row?.activeZoneCount ?? row?.zones ?? 0),
      safetyScore,
    });
  }

  console.info(`[fetchLatestSafetyUsers] ✅ Received ${json.users.length} raw users, normalized to ${normalized.length}`);
  return normalized;
}
