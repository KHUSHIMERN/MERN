# CommunityConnect unified API response formats

All JSON endpoints return an appropriate HTTP status. Authentication uses a short-lived Bearer access token. Refresh credentials are stored only in the HTTP-only `cc_refresh_token` cookie.

Errors use this common minimum shape:

```json
{ "message": "Human-readable error description." }
```

Validation and authorization errors may add fields such as `success`, `isVerified`, or `error`. Clients must use the HTTP status and `message`; they should not depend on optional diagnostic fields.

## Authentication

### `POST /api/auth/register`

Request: `{ "name", "email", "password", "confirmPassword", "role" }`. Roles allowed at public registration are `resident` and `organizer`.

`201 Created`:

```json
{ "message": "Registration successful!...", "user": { "_id": "...", "isVerified": false } }
```

Development mode also includes `verificationToken`, `verificationLink`, and `backendVerifyLink`. These fields are omitted in production.

### `GET /api/auth/verify?token=...`

`200 OK`: `{ "success": true, "message": "Email address verified successfully!...", "user": { } }`

### `POST /api/auth/login`

`200 OK`:

```json
{ "message": "Login successful!", "accessToken": "jwt", "token": "jwt", "user": { } }
```

The response also sets the HTTP-only refresh cookie. Unverified accounts receive `403` and no session.

### `POST /api/auth/refresh`

Requires the refresh cookie. `200 OK`: `{ "accessToken": "new-jwt", "token": "new-jwt" }`. Each successful call revokes the supplied refresh token and rotates the cookie. Missing, expired, revoked, or replayed tokens receive `401`.

### `POST /api/auth/logout`

`200 OK`: `{ "message": "Logged out successfully." }`. The active refresh token is revoked and the cookie is cleared.

## Events

### `GET /api/events`

Public; an optional valid access token adds current-user state.

```json
{
  "success": true,
  "count": 1,
  "data": [EVENT],
  "events": [EVENT]
}
```

`data` and `events` intentionally contain the same array for legacy compatibility.

### `GET /api/events/:id`

```json
{ "success": true, "data": EVENT }
```

The event is also spread onto the top level for legacy clients. Normalized RSVP additions on each `EVENT` are:

```json
{
  "confirmedCount": 10,
  "attendeesCount": 10,
  "rsvpCount": 10,
  "waitlistCount": 2,
  "userRegistrationStatus": "none|confirmed|waitlist",
  "userWaitlistPosition": 0
}
```

Event creation requires `title`, `description`, `category`, and the route-specific date/organizer validation.

## RSVP and waitlist

All endpoints require a valid access token and a verified account.

### `POST /api/events/:id/rsvp`

`201 Created`:

```json
{
  "message": "RSVP confirmed successfully!",
  "status": "confirmed|waitlist",
  "waitlistPosition": 0,
  "rsvp": { "_id": "...", "eventId": "...", "userId": "...", "status": "confirmed" }
}
```

Duplicate active registration receives `409`. The unique `{eventId,userId}` record is reused after cancellation.

### `DELETE /api/events/:id/rsvp`

```json
{
  "message": "Registration successfully cancelled.",
  "previousStatus": "confirmed|waitlist",
  "slotFreed": true,
  "promotedUser": { "id": "...", "name": "...", "email": "..." }
}
```

`promotedUser` is `null` when no promotion occurs.

### `GET /api/events/:id/rsvp`

```json
{ "status": "none|confirmed|waitlist", "waitlistPosition": 0, "rsvp": null }
```

## Organizer Registration Desk

### `GET /api/events/:id/rsvps`

Restricted to the event owner or an administrator. Unrelated organizers receive `403`.

```json
{
  "eventId": "...",
  "capacity": 100,
  "confirmedCount": 1,
  "waitlistCount": 1,
  "confirmed": [{ "id": "...", "name": "...", "email": "...", "rsvpId": "...", "createdAt": "..." }],
  "waitlist": [{ "id": "...", "name": "...", "email": "...", "rsvpId": "...", "createdAt": "...", "position": 1 }],
  "promotions": [{ "rsvpId": "...", "userId": "...", "name": "...", "email": "...", "promotedAt": "..." }]
}
```

Waitlist entries are returned in FIFO order.

## Notifications

All notification endpoints require authentication and operate only on the current user's records.

### `GET /api/notifications`

```json
{
  "unreadCount": 1,
  "notifications": [{
    "id": "...",
    "type": "promoted_from_waitlist",
    "payload": { "status": "confirmed", "message": "..." },
    "isRead": false,
    "readAt": null,
    "createdAt": "...",
    "event": { "_id": "...", "title": "...", "startDate": "...", "location": { }, "category": "..." }
  }]
}
```

Use `?unread=true` to return unread records only and `?limit=30` to control the list size (maximum 100).

### `PATCH /api/notifications/:id/read`

`200 OK`: `{ "notification": NOTIFICATION }`. A notification belonging to another user is returned as `404` to avoid revealing its existence.

### `PATCH /api/notifications/read-all`

`200 OK`: `{ "message": "All notifications marked as read.", "modifiedCount": 3 }`

## Security status summary

- `401`: missing, invalid, expired, or wrong-type access token.
- `403`: authenticated but unverified, wrong role, or not the event owner.
- `404`: resource absent or intentionally hidden from the current user.
- `409`: duplicate active RSVP.
