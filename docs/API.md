# Shopping List API Documentation

**Base URL:** `http://localhost:3000/api/v1`

All responses follow a standard format with `success`, `data`, and `timestamp` fields. Failed responses also include an `error` object.

---

## Table of Contents

- [Standard Response Format](#standard-response-format)
- [Health Check](#health-check)
- [Authentication Endpoints](#authentication-endpoints)
    - [POST /auth/register](#post-authregister)
    - [POST /auth/login](#post-authlogin)
    - [POST /auth/logout](#post-authlogout)
    - [POST /auth/change-password](#post-authchange-password)
- [Shopping Lists Endpoints](#shopping-lists-endpoints)
    - [GET /lists](#get-lists)
    - [POST /lists](#post-lists)
    - [PUT /lists/{list_id}](#put-listslist_id)
    - [DELETE /lists/{list_id}](#delete-listslist_id)
- [Sections Endpoints](#sections-endpoints)
    - [GET /lists/{list_id}/sections](#get-listslist_idsections)
    - [POST /lists/{list_id}/sections](#post-listslist_idsections)
    - [PUT /lists/{list_id}/sections/{section_id}](#put-listslist_idsectionssection_id)
    - [DELETE /lists/{list_id}/sections/{section_id}](#delete-listslist_idsectionssection_id)
- [Items Endpoints (Phase 3)](#items-endpoints-phase-3)
- [Sync Endpoints (Phase 3)](#sync-endpoints-phase-3)
- [Error Codes](#error-codes)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Timestamps](#timestamps)
- [Data Constraints](#data-constraints)

---

## Standard Response Format

### Success Response

```json
{
	"success": true,
	"data": {/* endpoint-specific data */},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

### Error Response

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "ERROR_CODE",
		"message": "Human-readable error message"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

## Health Check

### GET /health

Check server health status. No authentication required.

**Request:**

- Method: `GET`
- Headers: None
- Body: None

**Response Codes:**

- `200 OK` - Server is healthy
- `503 Service Unavailable` - Server health check failed

**Response (200):**

```json
{
	"success": true,
	"data": {
		"status": "healthy",
		"uptime": 3600,
		"environment": "development",
		"checks": {
			"database": "ok",
			"csvAccess": "ok"
		}
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (503):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "HEALTH_CHECK_FAILED",
		"message": "Database or file system check failed"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request:**

- Method: `POST`
- Headers: `Content-Type: application/json`
- Body:

```json
{
	"username": "string (3-32 chars, alphanumeric + underscore)",
	"email": "string (valid email, unique, lowercased)",
	"password": "string (min 8 characters)"
}
```

**Response Codes:**

- `201 Created` - User successfully registered
- `400 Bad Request` - Validation error (missing field, invalid format)
- `409 Conflict` - Username or email already exists
- `500 Internal Server Error` - Server error

**Response (201):**

```json
{
	"success": true,
	"data": {
		"user_id": "u001",
		"username": "john_doe",
		"email": "john@example.com",
		"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		"created_at": "2026-07-10T15:30:00Z"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (409):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "CONFLICT",
		"message": "Username already exists"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### POST /auth/login

Authenticate user and receive session token.

**Request:**

- Method: `POST`
- Headers: `Content-Type: application/json`
- Body:

```json
{
	"username": "string",
	"password": "string"
}
```

**Response Codes:**

- `200 OK` - Login successful
- `400 Bad Request` - Validation error (missing field)
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": {
		"user_id": "u001",
		"username": "john_doe",
		"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		"expires_in": 2592000
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (401):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "UNAUTHORIZED",
		"message": "Invalid credentials"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### POST /auth/logout

Logout and invalidate session token.

**Request:**

- Method: `POST`
- Headers: `Authorization: Bearer {token}`
- Body: None

**Response Codes:**

- `200 OK` - Logout successful
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": null,
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### POST /auth/change-password

Change password for authenticated user.

**Request:**

- Method: `POST`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body:

```json
{
	"old_password": "string",
	"new_password": "string (min 8 characters)"
}
```

**Response Codes:**

- `200 OK` - Password changed successfully
- `400 Bad Request` - Validation error (invalid new password)
- `401 Unauthorized` - Invalid token or old password
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": null,
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (401):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "UNAUTHORIZED",
		"message": "Current password is incorrect"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

## Shopping Lists Endpoints

### GET /lists

Get all shopping lists for authenticated user.

**Request:**

- Method: `GET`
- Headers: `Authorization: Bearer {token}`
- Body: None

**Response Codes:**

- `200 OK` - Lists retrieved successfully
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": [
		{
			"list_id": "l001",
			"list_name": "Grocery Shopping",
			"created_at": "2026-01-20T10:00:00Z",
			"last_modified": "2026-07-04T09:30:00Z",
			"version": "1",
			"item_count": 0,
			"completed_count": 0
		}
	],
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### POST /lists

Create a new shopping list.

**Request:**

- Method: `POST`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body:

```json
{
	"list_name": "string (1-100 characters)"
}
```

**Response Codes:**

- `201 Created` - List created successfully
- `400 Bad Request` - Validation error (empty name, exceeds 100 chars, max lists reached)
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

**Response (201):**

```json
{
	"success": true,
	"data": {
		"list_id": "l002",
		"list_name": "Hardware Store",
		"created_at": "2026-07-10T15:30:00Z",
		"last_modified": "2026-07-10T15:30:00Z",
		"version": "1"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (400):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "List name must be 100 characters or less"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### PUT /lists/{list_id}

Rename an existing shopping list with optional optimistic locking support.

**Request:**

- Method: `PUT`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- URL Parameters: `list_id` (string)
- Body:

```json
{
	"list_name": "string (1-100 characters)",
	"expected_version": "string (optional, for optimistic locking)"
}
```

**Response Codes:**

- `200 OK` - List renamed successfully
- `400 Bad Request` - Validation error (empty name, exceeds 100 chars)
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - List not found or belongs to different user
- `409 Conflict` - Version mismatch (when expected_version is provided)
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": {
		"list_id": "l001",
		"list_name": "New Name",
		"last_modified": "2026-07-10T15:30:00Z",
		"version": "2"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (404):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "NOT_FOUND",
		"message": "List not found"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (409):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "CONFLICT",
		"message": "Version conflict: expected 1, but current version is 2"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### DELETE /lists/{list_id}

Delete a shopping list and all its sections. (Item cleanup will be added when items are implemented in Phase 3.)

**Request:**

- Method: `DELETE`
- Headers: `Authorization: Bearer {token}`
- URL Parameters: `list_id` (string)
- Body: None

**Response Codes:**

- `200 OK` - List deleted successfully
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - List not found or belongs to different user
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": null,
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

## Sections Endpoints

### GET /lists/{list_id}/sections

Get all sections for a specific list.

**Request:**

- Method: `GET`
- Headers: `Authorization: Bearer {token}`
- URL Parameters: `list_id` (string)
- Body: None

**Response Codes:**

- `200 OK` - Sections retrieved successfully
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - List not found or belongs to different user
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": [
		{
			"section_id": "sec001",
			"list_id": "l001",
			"section_name": "Produce",
			"sort_order": 1,
			"version": "1",
			"created_at": "2026-01-20T10:00:00Z",
			"last_modified": "2026-01-20T10:00:00Z"
		}
	],
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### POST /lists/{list_id}/sections

Create a new section in a list.

**Request:**

- Method: `POST`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- URL Parameters: `list_id` (string)
- Body:

```json
{
	"section_name": "string (1-50 characters)"
}
```

**Response Codes:**

- `201 Created` - Section created successfully
- `400 Bad Request` - Validation error (empty name, exceeds 50 chars, max sections reached)
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - List not found or belongs to different user
- `500 Internal Server Error` - Server error

**Response (201):**

```json
{
	"success": true,
	"data": {
		"section_id": "sec003",
		"list_id": "l001",
		"section_name": "Meat",
		"sort_order": 3,
		"created_at": "2026-07-10T15:30:00Z",
		"last_modified": "2026-07-10T15:30:00Z",
		"version": "1"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (400):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Maximum 50 sections per list reached"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### PUT /lists/{list_id}/sections/{section_id}

Update a section (rename and/or reorder) with optional optimistic locking support.

**Request:**

- Method: `PUT`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- URL Parameters: `list_id` (string), `section_id` (string)
- Body: At least one of the following fields must be provided:

```json
{
	"section_name": "string (1-50 characters, optional)",
	"sort_order": "integer >= 1 (optional)",
	"expected_version": "string (optional, for optimistic locking)"
}
```

**Response Codes:**

- `200 OK` - Section updated successfully
- `400 Bad Request` - Validation error (missing both parameters, name exceeds 50 chars, invalid sort_order)
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - List or section not found or belongs to different user
- `409 Conflict` - Version mismatch (when expected_version is provided)
- `500 Internal Server Error` - Server error

**Response (200 - Rename only):**

```json
{
	"success": true,
	"data": {
		"section_id": "sec003",
		"list_id": "l001",
		"section_name": "Poultry",
		"sort_order": 2,
		"last_modified": "2026-07-10T15:30:00Z",
		"version": "2"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (200 - Reorder only):**

```json
{
	"success": true,
	"data": {
		"section_id": "sec003",
		"list_id": "l001",
		"section_name": "Poultry",
		"sort_order": 100,
		"last_modified": "2026-07-10T15:30:00Z",
		"version": "2"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (200 - Rename and reorder):**

```json
{
	"success": true,
	"data": {
		"section_id": "sec003",
		"list_id": "l001",
		"section_name": "Dairy & Eggs",
		"sort_order": 5,
		"last_modified": "2026-07-10T15:30:00Z",
		"version": "3"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Response (409):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "CONFLICT",
		"message": "Version conflict: expected 1, but current version is 2"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

### DELETE /lists/{list_id}/sections/{section_id}

Delete a section from a list.

**Request:**

- Method: `DELETE`
- Headers: `Authorization: Bearer {token}`
- URL Parameters: `list_id` (string), `section_id` (string)
- Body: None

**Response Codes:**

- `200 OK` - Section deleted successfully
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - List or section not found or belongs to different user
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": null,
	"timestamp": "2026-07-10T15:30:00Z"
}
```

---

## Items Endpoints (Phase 3)

_Coming in Phase 3 - Backend API: Items & Sync_

- `GET /lists/{list_id}/items` - Get all items for list
- `POST /lists/{list_id}/items` - Create new item
- `PUT /lists/{list_id}/items/{item_id}` - Update item (rename, change section, toggle completion)
- `DELETE /lists/{list_id}/items/{item_id}` - Delete item

---

## Sync Endpoints (Phase 3)

_Coming in Phase 3 - Backend API: Items & Sync_

- `POST /sync/items` - Client-server reconciliation with conflict resolution

---

## Error Codes

| Code                  | HTTP Status | Description                                           |
| --------------------- | ----------- | ----------------------------------------------------- |
| `VALIDATION_ERROR`    | 400         | Input validation failed                               |
| `UNAUTHORIZED`        | 401         | Invalid or missing authentication token               |
| `NOT_FOUND`           | 404         | Requested resource not found                          |
| `CONFLICT`            | 409         | Resource conflict (version mismatch, duplicate entry) |
| `INTERNAL_ERROR`      | 500         | Server-side error                                     |
| `HEALTH_CHECK_FAILED` | 503         | Server health check failed                            |

---

## Authentication

All endpoints except `/health`, `/auth/register`, and `/auth/login` require authentication.

**Header Format:**

```
Authorization: Bearer {token}
```

Where `{token}` is the JWT token received from `/auth/login`.

---

## Rate Limiting

Global rate limiting is enabled:

- **Window:** 60 seconds
- **Max Requests:** 100 per window per IP
- **Login Endpoint:** Additional protection against brute force attacks

---

## Timestamps

All timestamps are in ISO 8601 format (UTC):

```
2026-07-10T15:30:00Z
```

---

## Data Constraints

| Field                 | Type    | Constraints                                |
| --------------------- | ------- | ------------------------------------------ |
| username              | string  | 3-32 characters, alphanumeric + underscore |
| password              | string  | Minimum 8 characters                       |
| email                 | string  | Valid email format, unique, lowercased     |
| list_name             | string  | 1-100 characters                           |
| section_name          | string  | 1-50 characters                            |
| Max lists per user    | integer | 100                                        |
| Max sections per list | integer | 50                                         |
