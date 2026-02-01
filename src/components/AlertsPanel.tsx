import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Filter,
  Wifi,
  WifiOff,
} from "lucide-react";
import { SOSAlert } from "../types";
import alertsApi from "../api/alerts";
import { useToast } from "./ToastProvider";
import { useSOSAlerts } from "../hooks/useSOSAlerts";
import { AuthorityAlertCard } from "./AuthorityAlertCard";
import { AlertDetailView } from "./AlertDetailView";
import { formatTimeAgo, getSeverityColors, getSeverityFromScore } from "../utils/formatters";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

// Helper: map backend alert (see apidocs.md) to frontend SOSAlert
const mapBackendToSOS = (a: any): SOSAlert => {
  // backend example fields: id, touristId, status, location: { coordinates: [lng, lat], locationName }, safetyScore, sosReason, emergencyContact, timestamp
  // Accept several location shapes: { location: { coordinates: [lng, lat] } },
  // { location: { lat, lng } }, or top-level lat/lng fields.
  let lng = 0;
  let lat = 0;
  if (a.location) {
    if (Array.isArray(a.location.coordinates) && a.location.coordinates.length >= 2) {
      lng = Number(a.location.coordinates[0]) || 0;
      lat = Number(a.location.coordinates[1]) || 0;
    } else if (typeof a.location.lat === 'number' && typeof a.location.lng === 'number') {
      lat = Number(a.location.lat) || 0;
      lng = Number(a.location.lng) || 0;
    }
  } else if (typeof a.lat === 'number' && typeof a.lng === 'number') {
    lat = Number(a.lat) || 0;
    lng = Number(a.lng) || 0;
  }

  // derive severity from safetyScore if provided
  // Backend sends safetyScore as decimal (0-1), convert to 0-100 if needed
  let safety = typeof a.safetyScore === "number" ? a.safetyScore : 50;
  // Convert decimal scores (0-1) to percentage (0-100)
  if (safety <= 1) {
    safety = safety * 100;
  }

  let severity: SOSAlert["severity"] = "medium";
  if (safety >= 80) severity = "low";
  else if (safety >= 50) severity = "medium";
  else if (safety >= 20) severity = "high";
  else severity = "critical";

  const sosReason = a.sosReason || {};
  // backend may have emergencyContact or emergencyContacts (array)
  const emergencyContact =
    a.emergencyContact ||
    (Array.isArray(a.emergencyContacts) && a.emergencyContacts[0]) ||
    (a.contact && (a.contact.name || a.contact.phone) ? a.contact : null) ||
    {};

  // try to pick an emergencyType from reason text heuristically
  const reasonText = (sosReason.reason || "").toLowerCase();
  let emergencyType: SOSAlert["emergencyType"] = "medical";
  if (
    reasonText.includes("cyclone") ||
    reasonText.includes("flood") ||
    reasonText.includes("earthquake") ||
    reasonText.includes("storm")
  ) {
    emergencyType = "natural_disaster";
  } else if (reasonText.includes("accident")) {
    emergencyType = "accident";
  } else if (
    reasonText.includes("attack") ||
    reasonText.includes("robbery") ||
    reasonText.includes("assault")
  ) {
    emergencyType = "crime";
  } else if (reasonText.includes("lost")) {
    emergencyType = "lost";
  }

  const descriptionParts: string[] = [];
  if (sosReason.reason) descriptionParts.push(String(sosReason.reason));
  if (sosReason.weatherInfo) {
    // weatherInfo may be object or string
    descriptionParts.push(
      typeof sosReason.weatherInfo === "string"
        ? sosReason.weatherInfo
        : JSON.stringify(sosReason.weatherInfo),
    );
  }
  if (sosReason.extra) {
    descriptionParts.push(
      typeof sosReason.extra === "string"
        ? sosReason.extra
        : JSON.stringify(sosReason.extra),
    );
  }

  // Check for tourist object
  const tourist = a.tourist || {};

  return {
    // Backend socket emits alertId, REST API uses _id/id - check all three
    id: String(a.alertId || a._id || a.id || Date.now()),
    alertId: a.alertId || a._id || a.id,
    // Try multiple fields for tourist id/name (backend may use nested objects)
    touristId:
      String(a.touristId || tourist.id || tourist._id || a.id || a._id || ""),
    touristName:
      a.touristName || tourist.name || tourist.fullName ||
      // Only fallback to other names if explicitly NOT emergency contact
      (a.name !== emergencyContact?.name ? a.name : null) ||
      `Tourist ${a.touristId || tourist.id || "Unknown"}`,
    // New fields from backend - check top level then nested tourist object
    govId: a.govId || tourist.govId || tourist.govIdHash || null, // Handle both govId and legacy hash
    phone: a.phone || tourist.phone || tourist.phoneNumber || null,
    age: a.age || tourist.age || null,
    nationality: a.nationality || tourist.nationality || tourist.country || null,
    gender: a.gender || tourist.gender || null,
    bloodGroup: a.bloodGroup || tourist.bloodGroup || null,
    medicalConditions: a.medicalConditions || tourist.medicalConditions || null,
    allergies: a.allergies || tourist.allergies || null,
    emergencyContact: a.emergencyContact || emergencyContact || null,
    locationName: a.locationName || (a.location && a.location.locationName) || null,
    location: {
      lat: Number(lat) || 0,
      lng: Number(lng) || 0,
      coordinates: [lng, lat],
      address:
        a.locationName ||
        (a.location && (a.location.locationName || a.location.address)) ||
        a.address ||
        "Unknown location",
    },
    emergencyType,
    severity,
    sosReason: a.sosReason,
    timestamp: a.timestamp || new Date().toISOString(),
    status: a.status || "new",
    // assignedTo may be an array of strings or objects { authorityId, fullName, role }
    assignedUnit: Array.isArray(a.assignedTo) && a.assignedTo.length
      ? typeof a.assignedTo[0] === 'object'
        ? (a.assignedTo[0].fullName || a.assignedTo[0].authorityId || 'Unknown Unit')
        : String(a.assignedTo[0])
      : a.assignedUnit,
    // Keep raw array but ensure we don't break likely string[] consumers if strictly typed?
    // For now, let's just leave assignedTo as is, complex objects will just exist in the data
    assignedTo: Array.isArray(a.assignedTo) ? a.assignedTo : [],
    // If backend returns a number (seconds), formatted it, else pass through
    responseTime:
      typeof a.responseTime === 'number'
        ? formatTimeAgo(new Date(Date.now() - a.responseTime * 1000)).replace("ago", "") // rough fallback or just leave as is?
        // Better: recreate the HH:MM:SS format if it's seconds
        // Actually, let's just allow it or simple format:
        : a.responseTime,
    responseDate: a.responseDate,
    contactInfo:
      emergencyContact?.phone ||
      (Array.isArray(a.emergencyContacts) &&
        a.emergencyContacts[0] &&
        a.emergencyContacts[0].phone) ||
      a.contactInfo ||
      "",
    description: descriptionParts.join(" - "),
    emergencyContactName:
      emergencyContact?.name ||
      (Array.isArray(a.emergencyContacts) &&
        a.emergencyContacts[0] &&
        a.emergencyContacts[0].name) ||
      "",
    isLoggedOnChain: a.isLoggedOnChain === true,
    safetyScore: safety,
  } as SOSAlert;
};

const AlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [filter, setFilter] = useState<
    "all" | "new" | "assigned" | "in_progress"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Use the SOS alerts hook for real-time updates (latestAlert only)
  const { latestAlert } = useSOSAlerts();

  // Track socket connection state
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Check socket connection status
  useEffect(() => {
    const checkConnection = () => {
      const sock = (window as any).getAuthoritySocket ? (window as any).getAuthoritySocket() : null;
      setIsSocketConnected(sock?.connected || false);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 3000);

    return () => clearInterval(interval);
  }, []);

  const assignPoliceUnit = async (alertId: string) => {
    try {
      const alert = alerts.find((a) => a.id === alertId);
      let responseTimeVal: string | number = 0;

      if (alert) {
        const start = new Date(alert.timestamp).getTime();
        const now = Date.now();
        // Calculate difference in seconds
        const diff = Math.floor((now - start) / 1000);

        // Format for display/logging if needed, but send NUMBER to backend
        // This avoids 500 errors if backend expects Number
        responseTimeVal = diff;
      }

      console.log("👮 Assigning unit to alert:", alertId, "Response Time (seconds):", responseTimeVal);
      const updatedRaw = await alertsApi.assignUnit(alertId, { responseTime: responseTimeVal });
      const updated = mapBackendToSOS(updatedRaw);

      showToast("Unit assigned successfully", "success");
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? updated : a))
      );
    } catch (err: any) {
      console.error("Failed to assign unit:", err);
      showToast(err.message || "Failed to assign unit", "error");
    }
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === alertId
          ? { ...alert, status: "resolved" as const }
          : alert,
      ),
    );
  };
  const handleRespond = (alert: SOSAlert) => {
    if (alert.status === "new") {
      assignPoliceUnit(alert.id);
    } else if (alert.status !== "resolved") {
      resolveAlert(alert.id);
    }
  };




  const filteredAlerts =
    filter === "all"
      ? alerts
      : alerts.filter((alert) => {
        if (filter === "assigned") {
          return alert.status === "assigned" || alert.status === "responding";
        }
        return alert.status === filter;
      });
  const newAlertsCount = alerts.filter(
    (alert) => alert.status === "new",
  ).length;

  useEffect(() => {
    let subId: string | null = null;

    const loadInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;
        let mapped;

        if (filter === "assigned") {
          data = await alertsApi.fetchRespondingAlerts();
          mapped = (Array.isArray(data) ? data : []).map(mapBackendToSOS);
          // When fetching assigned, we replace the view or merge?
          // User request implies this is THE route for assigned alerts.
          // We can merge with existing 'new' alerts to keep them visible if needed, 
          // or just switch the view. For now, let's update the main alerts list 
          // but arguably we should manage 'assigned' separately or just re-fetch all.
          // Strategy: Fetch all standard alerts + assigned details and merge.
          const standardData = await alertsApi.fetchAlerts();
          const standardMapped = (Array.isArray(standardData) ? standardData : []).map(mapBackendToSOS);

          // Merge: use responding detail if available, else standard
          const merged = [...standardMapped];
          mapped.forEach(assignedAlert => {
            const idx = merged.findIndex(a => a.id === assignedAlert.id);
            if (idx >= 0) {
              merged[idx] = assignedAlert;
            } else {
              merged.push(assignedAlert);
            }
          });
          setAlerts(merged);
        } else {
          data = await alertsApi.fetchAlerts();
          mapped = (Array.isArray(data) ? data : []).map(mapBackendToSOS);
          setAlerts(mapped);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    };

    loadInitial();

    // subscribe to live updates
    try {
      subId = alertsApi.subscribeToAlerts((payload: any[]) => {
        console.log("[AlertsPanel] ðŸ“¨ Received alert update via subscription");
        console.log("[AlertsPanel] Payload:", payload);

        try {
          // Backend may send a single alert object or an array. Normalize to array.
          const incomingRaw = Array.isArray(payload) ? payload : [payload];
          const incomingMapped = incomingRaw.map(mapBackendToSOS);

          console.log("[AlertsPanel] Mapped alerts:", incomingMapped.map(a => ({ id: a.id, name: a.touristName })));

          // If we received a single alert, merge it into existing list (update by id or prepend).
          if (incomingMapped.length === 1) {
            const inc = incomingMapped[0];

            // Validate the alert has a proper ID to prevent duplicates
            if (!inc.id || inc.id === 'undefined') {
              console.error("[AlertsPanel] âŒ Alert missing valid ID, skipping:", inc);
              return;
            }

            console.log(`[AlertsPanel] âœ… Processing alert ID:`, inc.id, "Tourist:", inc.touristName);

            setAlerts((prev) => {
              // update existing alert if present
              const idx = prev.findIndex((a) => a.id === inc.id);
              if (idx !== -1) {
                console.log(`[AlertsPanel] Updating existing alert at index ${idx}:`, inc.id);
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...inc };
                return copy;
              }
              // otherwise prepend new alert
              console.log("[AlertsPanel] âœ¨ Adding new alert:", inc.id);
              return [inc, ...prev];
            });
            // show a toast for immediate visibility
            try {
              showToast(`New SOS: ${incomingMapped[0].touristName}`, "info");
            } catch (e) {
              // ignore toast errors
            }
          } else {
            // multi-alert payloads replace the current list (initial load or bulk update)
            console.log("[AlertsPanel] Replacing entire alert list with", incomingMapped.length, "alerts");
            setAlerts(incomingMapped);
          }
        } catch (e) {
          // ignore mapping error
          // eslint-disable-next-line no-console
          console.error("[AlertsPanel] âŒ Error mapping incoming alerts:", e);
        }
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        "[AlertsPanel] Failed to subscribe to alerts, will rely on polling if available",
        e,
      );
    }

    return () => {
      if (subId) alertsApi.unsubscribe(subId);
    };
  }, [
    filter,
    // Re-run subscription only if filter changes? 
    // Actually alertsApi probably handles deduping, but for safety let's leave deps as is.
  ]);

  // Deep Link Handling - DISABLED to prevent auto-opening cards
  // User can manually open cards by clicking on them
  // useEffect(() => {
  //   const params = new URLSearchParams(location.search);
  //   const openAlertId = params.get('openAlertId');
  //   if (openAlertId && alerts.length > 0) {
  //     const targetAlert = alerts.find(a => a.alertId === openAlertId || a.id === openAlertId);
  //     if (targetAlert) {
  //       console.log("🔗 Deep linking to alert:", openAlertId);
  //       setSelectedAlert(targetAlert);
  //     }
  //   }
  // }, [location.search, alerts]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('[AlertsPanel] Notification permission:', permission);
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            SOS Alerts & Emergency Response
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time emergency alerts and incident management
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {/* Socket Connection Status */}
          <Badge variant={isSocketConnected ? "default" : "destructive"} className={`flex items-center space-x-2 px-3 py-1.5 ${isSocketConnected
            ? "bg-green-100 text-green-800 hover:bg-green-100"
            : "bg-red-100 text-red-800 hover:bg-red-100"
            }`}>
            {isSocketConnected ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Disconnected</span>
              </>
            )}
          </Badge>

          {newAlertsCount > 0 && (
            <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 px-3 py-1.5 flex items-center justify-center h-8">
              {newAlertsCount} New Alert{newAlertsCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="destructive" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Create Alert</span>
          </Button>
        </div>
      </div>

      {/* Emergency Response Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter((a) => a.status === "new").length}
            </p>
            <p className="text-sm text-red-700">New Alerts</p>
          </CardContent>
        </Card>
        <Card className="text-center bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">
              {alerts.filter((a) => a.status === "assigned" || a.status === "responding").length}
            </p>
            <p className="text-sm text-blue-700">Assigned</p>
          </CardContent>
        </Card>
        <Card className="text-center bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">
              {alerts.filter((a) => a.status === "in_progress").length}
            </p>
            <p className="text-sm text-yellow-700">In Progress</p>
          </CardContent>
        </Card>
        <Card className="text-center bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">
              {alerts.filter((a) => a.status === "resolved").length}
            </p>
            <p className="text-sm text-green-700">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Alert Banner */}
      {latestAlert && (
        <Card className={`border-2 animate-pulse ${getSeverityColors(latestAlert.severity || getSeverityFromScore(latestAlert.safetyScore || 50)).bg} ${getSeverityColors(latestAlert.severity || getSeverityFromScore(latestAlert.safetyScore || 50)).border}`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className={`flex-1 ${getSeverityColors(latestAlert.severity || getSeverityFromScore(latestAlert.safetyScore || 50)).text}`}>
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  NEW SOS ALERT
                </h2>
                <p className="text-lg mb-1">
                  <strong>Location:</strong> {latestAlert.location.locationName || 'Unknown'}
                </p>
                <p className="text-sm opacity-90">
                  Tourist ID: {latestAlert.touristId} | Time: {new Date(latestAlert.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <Button
                onClick={() => setSelectedAlert(latestAlert)}
                variant="outline"
                className="bg-white text-red-600 hover:bg-gray-100 font-bold shadow-md"
              >
                View Alert Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs - Moved to Right */}
      <div className="flex justify-end">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <TabsList>
              <TabsTrigger value="new" className="relative">
                New
                {newAlertsCount > 0 && (
                  <Badge variant="destructive" className="ml-2 bg-red-500 text-white px-2 py-0 text-xs">
                    {newAlertsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
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
          <p className="text-gray-600">Loading live SOS alertsâ€¦</p>
        </div>
      )}

      {/* Alerts Grid - Authority Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAlerts.map((alert) => {
          // Highlight logic: Alert is less than 3 minutes old AND status is 'new'
          const isFresh = (Date.now() - new Date(alert.timestamp).getTime()) < 3 * 60 * 1000;
          const shouldHighlight = isFresh && alert.status === 'new';

          return (
            <AuthorityAlertCard
              key={alert.id}
              alert={alert}
              onRespond={handleRespond}
              onViewDetails={setSelectedAlert}
              isHighlighted={shouldHighlight}
            />
          );
        })}
      </div>

      {/* Alert Detail View */}
      {selectedAlert && (
        <AlertDetailView
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onRespond={handleRespond}
        />
      )}

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No alerts found
          </h3>
          <p className="text-gray-600">
            {filter === "all"
              ? "No emergency alerts at this time."
              : `No alerts with status "${filter.replace("_", " ")}" found.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
