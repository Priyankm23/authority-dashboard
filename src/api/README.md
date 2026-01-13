# Alerts API client

This folder contains a small frontend client for the Authority SOS alerts endpoint. It implements a simple dual-mode subscription model:

- Primary: Server-Sent Events (SSE) at /api/authority/alerts/stream
- Fallback: Periodic polling of GET /api/authority/alerts

Files:

- `alerts.ts` - main client. Exports `fetchAlerts()`, `subscribeToAlerts(cb)`, and `unsubscribe(id)`.

Environment variables (Vite / .env):

- `VITE_API_BASE_URL` - base URL for the backend API. Defaults to https://smart-tourist-safety-backend.onrender.com
- `VITE_SOS_POLL_INTERVAL` - polling interval in milliseconds when SSE is unavailable. Defaults to 5000 (5s).

Usage examples (in a React component):

1) Fetch once:

```ts
import { fetchAlerts } from './api/alerts';

async function load() {
  const alerts = await fetchAlerts();
  console.log(alerts);
}
```

2) Subscribe to live updates:

```ts
import { subscribeToAlerts, unsubscribe } from './api/alerts';
import { useEffect } from 'react';

useEffect(() => {
  const id = subscribeToAlerts((alerts) => {
    // handle live alerts
  });
  return () => unsubscribe(id);
}, []);
```

Notes:

- The SSE endpoint path used is `/api/authority/alerts/stream`. If your backend uses a different path for streaming, update `alerts.ts` accordingly.
- The client intentionally keeps implementation minimal and framework-agnostic.
