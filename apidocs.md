# Smart Tourist Safety Monitoring - Backend API Documentation

This backend provides APIs for managing tourist registration, login, and retrieving tourist information. All sensitive data is encrypted or hashed for security, and blockchain integration is used for audit purposes.

---

## 5. Get New SOS Alerts

**Endpoint:**

```
GET /api/authority/alerts
```

**Response (200 OK):**

```json
[
  {
    "id": "68c305fa481b6fc794e62b70",
    "touristId": "68c2c68bd03e438eca88fa4f",
    "status": "new",
    "location": {
      "coordinates": [80.1833, 16.3067],
      "locationName": "Andhra Pradesh Coast"
    },
    "safetyScore": 85,
    "sosReason": {
      "reason": "Cyclone warning",
      "weatherInfo": "Heavy rain expected",
      "extra": "Move to safer zone immediately"
    },
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "9876543211"
    },
    "timestamp": "2025-09-11T17:25:14.757Z",
    "isLoggedOnChain": true,
    "blockchainTxHash": "0x123abc456..."
  }
]
```

---
