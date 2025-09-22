/*
  Alerts API client
  - fetchAlerts(): Promise<Alert[]> -- fetch current alerts via REST
  - subscribeToAlerts(callback): string -- subscribe to SSE stream; returns subscription id
  - unsubscribe(id): void -- unsubscribe the SSE or polling

  Behavior:
  - Uses VITE_API_BASE_URL env var (fallback to provided base URL).
  - Tries to open an EventSource to /api/authority/alerts/stream
  - If EventSource isn't available or fails, falls back to polling GET /api/authority/alerts

  Types are lightweight and tailored for the frontend consumption.
*/

const DEFAULT_BASE = 'https://smart-tourist-safety-backend.onrender.com';
const API_BASE = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE;

export type Alert = {
  id: string;
  touristId?: string;
  status?: string;
  location?: any;
  safetyScore?: number;
  sosReason?: any;
  emergencyContact?: any;
  timestamp?: string;
  isLoggedOnChain?: boolean;
  blockchainTxHash?: string;
};

type Subscriber = {
  id: string;
  callback: (alerts: Alert[]) => void;
};

let subscribers: Subscriber[] = [];
let pollingTimer: number | null = null;
const POLL_INTERVAL = Number(import.meta.env.VITE_SOS_POLL_INTERVAL) || 5000;

export async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/api/authority/alerts`);
  if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.status}`);
  const data = await res.json();
  // backend may return { success: true, count: N, alerts: [ ... ] }
  if (data && Array.isArray(data)) return data as Alert[];
  if (data && Array.isArray(data.alerts)) return data.alerts as Alert[];
  // if the API returned a single object or unexpected format, try to normalize
  if (data && typeof data === 'object') {
    // attempt to find array-like property
    const possible = data.alerts || data.data || data.items;
    if (Array.isArray(possible)) return possible as Alert[];
  }
  // fallback: return empty array
  return [];
}

function notifyAll(alerts: Alert[]) {
  subscribers.forEach(s => {
    try {
      s.callback(alerts);
    } catch (e) {
      // swallow callback errors
      // eslint-disable-next-line no-console
      console.error('alerts subscriber callback error', e);
    }
  });
}

function startPolling() {
  if (pollingTimer) return;
  const run = async () => {
    try {
      const alerts = await fetchAlerts();
      notifyAll(alerts);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Polling alerts failed', e);
    }
  };
  run();
  pollingTimer = window.setInterval(run, POLL_INTERVAL) as unknown as number;
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// No SSE: use polling-only subscription to backend GET /api/authority/alerts

export function subscribeToAlerts(callback: (alerts: Alert[]) => void): string {
  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  subscribers.push({ id, callback });

  // Start polling when first subscriber registers
  if (subscribers.length === 1) {
    startPolling();
  }

  return id;
}

export function unsubscribe(id: string) {
  subscribers = subscribers.filter(s => s.id !== id);
  if (subscribers.length === 0) {
    // no subscribers left: close SSE / stop polling
    // stop polling
    stopPolling();
  }
}

export default {
  fetchAlerts,
  subscribeToAlerts,
  unsubscribe,
};
