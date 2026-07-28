# EventPulse MERN Application & REST API Contract

EventPulse is a full-stack community events platform built with **Node.js, Express, MongoDB (Mongoose), and React 19**.

---

## 📡 Event REST API Endpoint Specification

### Base URL: `/api/events`

| Method | Endpoint | Description | Auth / Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | List events with category, tags, date range, published, and search filters | Public |
| `GET` | `/api/events/:id` | Fetch single event details by ID, MongoDB ObjectId, or itemKey | Public |
| `POST` | `/api/events` | Create a new event with input and date range validation | Public / Organizer |
| `PUT` | `/api/events/:id` | Full update of event details by ID | Public / Organizer |
| `DELETE` | `/api/events/:id` | Delete event record by ID | Public / Organizer |
| `PATCH` | `/api/events/:id/publish` | Publish or unpublish an event (`published: true/false`) | Public / Organizer |
| `GET` | `/api/events/:id/attendance` | Fetch attendance list, pagination metadata & summary stats | Organizer (`x-user-role: organizer`) |
| `PATCH` | `/api/events/:id/attendance` | Update single or bulk attendee check-in status & audit logs | Organizer (`x-user-role: organizer`) |
| `GET` | `/api/events/:id/attendance/export` | Download CSV attendance report | Organizer (`x-user-role: organizer`) |
| `GET` | `/api/events/:id/attendance/audit-logs` | Fetch check-in audit trail log history | Organizer (`x-user-role: organizer`) |

---

### 1. `GET /api/events`
Fetch event listings with query parameters and text search.

**Query Parameters:**
- `category` *(string, optional)*: Filter by category (`tech`, `culture`, `workshop`, `charity`, or `all`).
- `tags` *(string / array, optional)*: Filter by tag(s), e.g. `tags=ai` or `tags=ai,react`.
- `published` *(boolean, optional)*: Filter by published status (`true` / `false` / `all`).
- `startDate` *(ISO Date string, optional)*: Filter events starting on or after timestamp (`startDate >= query.startDate`).
- `endDate` *(ISO Date string, optional)*: Filter events starting on or before timestamp (`startDate <= query.endDate`).
- `search` *(string, optional)*: Text search across `title`, `description`, and `location.placeName`.

**Example Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "66a501f2e1a2b3c4d5e6f7a8",
      "id": "evt-1",
      "title": "Tech Summit Bengaluru 2026",
      "description": "An annual tech summit gathering AI developers, startup founders, and cloud engineers.",
      "organizerId": "org-tech-hub",
      "category": "tech",
      "tags": ["ai", "cloud", "bengaluru"],
      "startDate": "2026-08-15T09:00:00.000Z",
      "endDate": "2026-08-17T18:00:00.000Z",
      "location": {
        "placeName": "Electronic City, Bengaluru",
        "latitude": 12.8399,
        "longitude": 77.677
      },
      "published": true,
      "image": "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
      "createdAt": "2026-07-28T09:00:00.000Z",
      "updatedAt": "2026-07-28T09:00:00.000Z"
    }
  ]
}
```

---

### 2. `GET /api/events/:id`
Fetch single event by ID or itemKey.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "evt-1",
    "title": "Tech Summit Bengaluru 2026",
    "organizerId": "org-tech-hub",
    "category": "tech",
    "published": true
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Event not found"
}
```

---

### 3. `POST /api/events`
Create a new event listing.

**Request Body (JSON):**
```json
{
  "title": "DevOps & Kubernetes Workshop 2026",
  "description": "Hands-on practical session on microservices architecture and CI/CD pipelines.",
  "organizerId": "org-cloud-devs",
  "category": "workshop",
  "tags": ["devops", "kubernetes", "docker"],
  "startDate": "2026-11-20T09:00:00.000Z",
  "endDate": "2026-11-20T17:00:00.000Z",
  "location": {
    "placeName": "Electronic City Phase 1, Bengaluru",
    "latitude": 12.84,
    "longitude": 77.67
  },
  "published": true,
  "image": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Event created successfully.",
  "id": "evt-1785220676209",
  "data": { ...createdEventObject }
}
```

**Validation Errors (400 Bad Request):**
- Missing required fields:
  ```json
  {
    "success": false,
    "message": "Validation Error: Required fields title, organizerId, and startDate must be provided."
  }
  ```
- Date range sanity check (`startDate > endDate`):
  ```json
  {
    "success": false,
    "message": "Validation Error: startDate cannot be after endDate."
  }
  ```

---

### 4. `PUT /api/events/:id`
Full update of event fields by ID.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Event updated successfully.",
  "data": { ...updatedEventObject }
}
```

---

### 5. `DELETE /api/events/:id`
Delete an event record by ID.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Event deleted successfully."
}
```

---

### 6. `PATCH /api/events/:id/publish`
Publish or unpublish an event. Updates `published` boolean and `updatedAt` timestamp while keeping other fields isolated.

**Request Body (JSON):**
```json
{
  "published": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Event published successfully.",
  "published": true,
  "data": { ...updatedEventObject }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation Error: published field must be a boolean value."
}
```

---

## 🧪 Running Integration Tests

Run the integration test suite covering happy and error paths:

```bash
cd backend
npm test
```

Test suite output verifies 9/9 integration assertions:
- `GET /api/events` ➔ `200 OK`
- `GET /api/events?category=tech&published=true` ➔ `200 OK`
- `GET /api/events/:id` ➔ `200 OK`
- `GET /api/events/invalid-id` ➔ `404 Not Found`
- `POST /api/events` (Valid) ➔ `201 Created`
- `POST /api/events` (Missing fields) ➔ `400 Bad Request`
- `POST /api/events` (Invalid date range) ➔ `400 Bad Request`
- `PATCH /api/events/:id/publish` (Boolean) ➔ `200 OK`
- `PATCH /api/events/:id/publish` (Non-boolean) ➔ `400 Bad Request`
