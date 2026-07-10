# LoveCode Admin API

> Backend reference for the `admin` frontend. All routes are prefixed with `/api/admin`.

---

## Setup

Before using the admin API, run `admin_setup.sql` in your Supabase SQL editor. It creates the required `admin_users`, `activity_logs`, `user_sessions`, and `user_events` tables (and adds a `status` column to `users` if missing).

---

## Authentication

The admin dashboard uses its own local JWT-based authentication (the `admin_users` table). All routes under `/api/admin` **except** the `/api/admin/auth/*` routes require a valid admin access token.

Include the token in the `Authorization` header:

```
Authorization: Bearer <admin_access_token>
```

Tokens are obtained from `POST /api/admin/auth/login` or `POST /api/admin/auth/register` and expire after 24 hours by default (configurable via `ADMIN_JWT_EXPIRY_MINUTES`).

Unauthenticated or non-admin requests receive `401 Unauthorized`.

---

## Common Patterns

### Pagination

List endpoints use offset pagination:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | 1-based page number |
| `limit` | integer | `20` | Items per page (max 100) |

Response wrapper:

```json
{
  "data": [],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Filtering & Search

- Search is **case-insensitive substring matching** on text fields.
- Status / plan filters are **exact case-insensitive matches**.

### Dates

All dates are **ISO 8601 strings** (e.g. `2026-06-09T14:06:33.327Z`).

---

## Endpoints

### Auth

#### `POST /auth/register`

Create a new admin account.

**Request Body**

```json
{
  "email": "admin@example.com",
  "password": "min8chars",
  "full_name": "Admin User"
}
```

**Registration Secret**

If at least one admin already exists, the request must include the header:

```
X-Admin-Registration-Secret: <ADMIN_REGISTRATION_SECRET>
```

When the `ADMIN_REGISTRATION_SECRET` environment variable is not set, additional registrations are disabled.

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Admin account created successfully."
}
```

**Response `409 Conflict`**

```json
{ "success": false, "error": "An admin with this email already exists." }
```

**Response `403 Forbidden`**

```json
{ "success": false, "error": "Admin registration is disabled. Set ADMIN_REGISTRATION_SECRET to enable." }
```

---

#### `POST /auth/login`

Authenticate an admin and receive a JWT access token.

**Request Body**

```json
{
  "email": "admin@example.com",
  "password": "min8chars"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "admin": {
    "id": "uuid",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

**Response `401 Unauthorized`**

```json
{ "success": false, "error": "Invalid email or password." }
```

---

#### `POST /auth/forgot-password`

Request a password reset token. Always returns the same generic message so the endpoint cannot be used to enumerate accounts.

**Request Body**

```json
{ "email": "admin@example.com" }
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "If the email exists, reset instructions have been sent."
}
```

In development mode, the raw reset token is also returned for testing:

```json
{
  "success": true,
  "message": "If the email exists, reset instructions have been sent.",
  "reset_token": "<one-time-token>"
}
```

---

#### `POST /auth/reset-password`

Reset an admin password using a valid reset token.

**Request Body**

```json
{
  "token": "<one-time-token>",
  "new_password": "min8chars"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Password reset successfully."
}
```

**Response `400 Bad Request`**

```json
{ "success": false, "error": "Invalid or expired reset token." }
```

---

#### `GET /auth/me`

Return the currently authenticated admin's profile.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required (admin Bearer token) |

**Response `200 OK`**

```json
{
  "id": "uuid",
  "email": "admin@example.com",
  "full_name": "Admin User",
  "role": "admin"
}
```

---

### `GET /stats`

Dashboard KPIs and chart data.

**Response `200 OK`**

```json
{
  "totalUsers": 150,
  "totalUsersChange": 12.5,
  "activeSubscriptions": 35,
  "activeSubscriptionsChange": 8.3,
  "mrr": 28450,
  "mrrChange": 5.2,
  "churnRate": 3.8,
  "churnRateChange": -0.5,
  "signupsTrend": [
    { "date": "2026-05-11", "value": 23 },
    { "date": "2026-05-12", "value": 31 }
  ],
  "revenueTrend": [
    { "date": "2026-01", "value": 21000 },
    { "date": "2026-02", "value": 24500 }
  ],
  "planDistribution": [
    { "name": "Basic", "value": 10 },
    { "name": "Pro", "value": 15 },
    { "name": "Enterprise", "value": 10 }
  ],
  "userStatusDistribution": [
    { "name": "Active", "value": 100 },
    { "name": "Inactive", "value": 30 },
    { "name": "Suspended", "value": 20 }
  ]
}
```

**Notes**
- `totalUsers` is computed with the exact same counting logic that powers `GET /users` without filters. It always matches the `total` field returned by `GET /users` when no `search` or `status` filter is applied.

---

### `GET /users`

Paginated, searchable, filterable user list.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Page size |
| `search` | string | `""` | Substring search on `name` and `email` |
| `status` | string | `""` | Exact filter: `Active`, `Inactive`, `Suspended` |

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "usr_1",
      "name": "Alex Smith",
      "email": "user1@example.com",
      "avatar": "https://...",
      "plan": "Pro",
      "status": "Active",
      "joinDate": "2026-01-15T08:30:00.000Z",
      "lastActive": "2026-06-08T12:00:00.000Z",
      "loginFrequency": 12,
      "appUsageCount": 145
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

### `GET /users/:id`

Full user details for the User Detail modal.

**Response `200 OK`**

```json
{
  "id": "usr_1",
  "name": "Alex Smith",
  "email": "user1@example.com",
  "avatar": "https://...",
  "plan": "Pro",
  "status": "Active",
  "joinDate": "2026-01-15T08:30:00.000Z",
  "lastActive": "2026-06-08T12:00:00.000Z",
  "phone": "+1 (555) 123-4567",
  "company": "TechCorp",
  "location": "San Francisco, CA",
  "role": "Full Stack",
  "bio": "Building the future with AI-powered apps...",
  "subscriptionHistory": [
    {
      "id": "sh_1",
      "plan": "Pro",
      "startDate": "2026-01-15T08:30:00.000Z",
      "endDate": "2026-07-15T08:30:00.000Z",
      "status": "Active",
      "amount": 99
    }
  ],
  "behaviorStats": {
    "loginFrequency": 12,
    "appUsageCount": 145,
    "avgSessionDuration": 24,
    "lastLoginIp": "192.168.1.42"
  },
  "projects": [
    {
      "id": "prj_1",
      "name": "E-Commerce Builder 7",
      "description": "A Next.js project built with TypeScript.",
      "status": "Published",
      "createdAt": "2026-03-10T10:00:00.000Z",
      "updatedAt": "2026-06-01T14:00:00.000Z",
      "deployments": 12,
      "stars": 45,
      "forks": 3,
      "language": "TypeScript",
      "framework": "Next.js"
    }
  ],
  "recentActivity": [
    {
      "id": "ua_1",
      "action": "Created project",
      "details": "Performed on E-Commerce Builder",
      "timestamp": "2026-06-07T09:30:00.000Z"
    }
  ]
}
```

**Response `404 Not Found`**

```json
{ "error": "User not found" }
```

---

### `PATCH /users/:id/status`

Update a user's account status.

**Request Body**

```json
{ "status": "Suspended" }
```

Validation: `status` must be one of `Active`, `Inactive`, `Suspended`.

**Response `200 OK`**

```json
{ "success": true }
```

**Response `400 Bad Request`**

```json
{ "error": "Missing or invalid 'status' field" }
```

**Side Effects**
- Creates an `ActivityLog` entry.

---

### `DELETE /users/:id`

Permanently delete a user and their associated data.

**Response `204 No Content`** — No body.

**Response `404 Not Found`**

```json
{ "error": "User not found" }
```

**Side Effects**
- Creates an `ActivityLog` entry.

---

### `GET /subscriptions`

Paginated, filterable subscription list.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Page size |
| `plan` | string | `""` | Exact filter: `Basic`, `Pro`, `Enterprise` |
| `status` | string | `""` | Exact filter: `Active`, `Canceled`, `Past Due` |

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "sub_1",
      "userId": "usr_1",
      "userName": "Alex Smith",
      "userEmail": "user1@example.com",
      "plan": "Pro",
      "startDate": "2026-01-15T08:30:00.000Z",
      "renewalDate": "2026-07-15T08:30:00.000Z",
      "paymentMethod": "Visa ending in 4242",
      "status": "Active",
      "amount": 99
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 20
}
```

---

### `PATCH /subscriptions/:id/cancel`

Cancel an active subscription.

**Request Body**

```json
{ "reason": "Customer requested cancellation" }
```

Validation: `reason` is required and must be a non-empty string.

**Response `200 OK`**

```json
{ "success": true }
```

**Response `400 Bad Request`**

```json
{ "error": "Missing or invalid 'reason' field" }
```

**Side Effects**
- Updates subscription `status` to `Canceled`.
- Records cancellation reason and timestamp.
- Creates an `ActivityLog` entry.

---

### `GET /behavior`

User behavior analytics for the Behavior page.

**Response `200 OK`**

```json
{
  "dau": [
    { "date": "2026-05-11", "value": 45 },
    { "date": "2026-05-12", "value": 62 }
  ],
  "wau": [
    { "date": "2026-05-11", "value": 120 },
    { "date": "2026-05-12", "value": 145 }
  ],
  "featureUsage": [
    { "feature": "App Builder", "count": 1200 },
    { "feature": "AI Assistant", "count": 950 }
  ],
  "engagementHeatmap": [
    { "day": "Mon", "hour": 0, "value": 12 },
    { "day": "Mon", "hour": 1, "value": 5 },
    { "day": "Mon", "hour": 2, "value": 0 }
  ],
  "topUsers": [
    {
      "id": "usr_1",
      "name": "Alex Smith",
      "email": "user1@example.com",
      "sessions": 340,
      "actions": 2100
    }
  ]
}
```

**Notes**
- `engagementHeatmap` returns exactly `7 × 24 = 168` cells.
- `day` values: `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`.
- `hour` values: `0–23`.

---

### `GET /activity`

Admin activity logs for the Logs page and Dashboard activity feed.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | `50` | Max entries to return (max 200) |

**Response `200 OK`**

```json
[
  {
    "id": "act_1",
    "admin": "admin1",
    "action": "suspended user",
    "target": "User #42",
    "timestamp": "2026-06-08T10:30:00.000Z"
  }
]
```

---

## Error Handling

All errors are returned as JSON:

```json
{ "error": "Human-readable error message" }
```

| Status | When to use |
|--------|-------------|
| `200 OK` | Successful GET, PATCH |
| `204 No Content` | Successful DELETE |
| `400 Bad Request` | Invalid body, missing required fields |
| `401 Unauthorized` | Missing or invalid auth token |
| `404 Not Found` | Resource does not exist |
| `500 Internal Server Error` | Unexpected server error |

---

## Appendix: Endpoint Summary

All admin dashboard routes require `Authorization: Bearer <admin_access_token>`.

```
POST   /api/admin/auth/register                { email, password, full_name }  [X-Admin-Registration-Secret]
POST   /api/admin/auth/login                   { email, password }
POST   /api/admin/auth/forgot-password         { email }
POST   /api/admin/auth/reset-password          { token, new_password }
GET    /api/admin/auth/me

GET    /api/admin/stats
GET    /api/admin/users?page&limit&search&status
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id/status             { status }
DELETE /api/admin/users/:id
GET    /api/admin/subscriptions?page&limit&plan&status
PATCH  /api/admin/subscriptions/:id/cancel     { reason }
GET    /api/admin/behavior
GET    /api/admin/activity?limit
```
