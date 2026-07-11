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
- [Developer Endpoints (Phase 4)](#developer-endpoints-phase-4)
    - [GET /developer/config](#get-developerconfig)
    - [POST /developer/config](#post-developerconfig)
    - [POST /developer/config/reload](#post-developerconfigreload)
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

Delete a shopping list and all its associated sections and items.

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

### Get All Items for List

**Endpoint:** `GET /lists/{list_id}/items`

**Authentication:** Required (Bearer token)

**Request:**

```http
GET /api/v1/lists/l001/items HTTP/1.1
Authorization: Bearer eyJhbGc...
```

**Response (200):**

```json
{
	"success": true,
	"data": [
		{
			"item_id": "i001",
			"item_name": "Apples",
			"section_id": "sec001",
			"is_completed": false,
			"created_at": "2026-01-20T10:00:00Z",
			"last_modified": "2026-01-20T10:00:00Z"
		},
		{
			"item_id": "i002",
			"item_name": "Milk",
			"section_id": null,
			"is_completed": true,
			"created_at": "2026-01-20T10:05:00Z",
			"last_modified": "2026-01-21T08:30:00Z"
		}
	],
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - List does not exist
- `500 Internal Server Error` - Server error

---

### Create Item

**Endpoint:** `POST /lists/{list_id}/items`

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
	"item_name": "Carrots",
	"section_id": "sec001" // optional, null for ungrouped
}
```

**Response (201):**

```json
{
	"success": true,
	"data": {
		"item_id": "i004",
		"item_name": "Carrots",
		"section_id": "sec001",
		"is_completed": false,
		"created_at": "2026-07-10T15:30:00Z",
		"last_modified": "2026-07-10T15:30:00Z"
	},
	"timestamp": "2026-07-10T15:30:00Z"
}
```

**Validation Errors (400):**

- `item_name` is required
- `item_name` must be 1-200 characters
- `section_id` is invalid for this list
- Maximum items per list exceeded
- List not found

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `400 Bad Request` - Validation error
- `500 Internal Server Error` - Server error

---

### Update Item

**Endpoint:** `PUT /lists/{list_id}/items/{item_id}`

**Authentication:** Required (Bearer token)

**Request Body (all fields optional, but at least one required):**

```json
{
	"item_name": "Carrots",
	"section_id": "sec002",
	"is_completed": true
}
```

**Response (200):**

```json
{
	"success": true,
	"data": {
		"item_id": "i004",
		"item_name": "Carrots",
		"section_id": "sec002",
		"is_completed": true,
		"last_modified": "2026-07-10T15:35:00Z"
	},
	"timestamp": "2026-07-10T15:35:00Z"
}
```

**Validation Errors (400):**

- At least one update field required (item_name, section_id, or is_completed)
- `item_name` must be 1-200 characters
- `section_id` is invalid for this list

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Item not found
- `400 Bad Request` - Validation error
- `500 Internal Server Error` - Server error

---

### Delete Item

**Endpoint:** `DELETE /lists/{list_id}/items/{item_id}`

**Authentication:** Required (Bearer token)

**Response (200):**

```json
{
	"success": true,
	"data": null,
	"timestamp": "2026-07-10T15:40:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Item not found
- `500 Internal Server Error` - Server error

---

## Sync Endpoints (Phase 3)

### Sync Items with Conflict Resolution

**Endpoint:** `POST /sync/items`

**Authentication:** Required (Bearer token)

**Purpose:** Reconcile client-side items with server state using last_modified timestamps for conflict resolution.

**Request Body:**

```json
{
	"list_id": "l001",
	"client_items": [
		{
			"item_id": "i001",
			"item_name": "Apples",
			"section_id": "sec001",
			"is_completed": false,
			"last_modified": "2026-07-10T14:00:00Z",
			"operation": "update"
		},
		{
			"item_id": "i999",
			"item_name": "New Item",
			"section_id": null,
			"is_completed": false,
			"last_modified": "2026-07-10T15:00:00Z",
			"operation": "create"
		},
		{
			"item_id": "i002",
			"item_name": "Milk",
			"section_id": null,
			"is_completed": true,
			"last_modified": "2026-07-10T15:15:00Z",
			"operation": "delete"
		}
	],
	"last_sync": "2026-07-10T09:00:00Z"
}
```

**Operations:**

- `create` - Add new item on server
- `update` - Modify existing item on server
- `delete` - Remove item from server

**Response (200):**

```json
{
	"success": true,
	"data": {
		"server_items": [
			{
				"item_id": "i001",
				"item_name": "Apples",
				"section_id": "sec001",
				"is_completed": false,
				"last_modified": "2026-07-10T14:00:00Z",
				"operation": "update"
			},
			{
				"item_id": "i999",
				"item_name": "New Item",
				"section_id": null,
				"is_completed": false,
				"last_modified": "2026-07-10T15:00:00Z",
				"operation": "update"
			}
		],
		"conflicts": [
			{
				"item_id": "i002",
				"type": "DELETE_CONFLICT",
				"message": "Server version is newer",
				"server_version": {
					"item_id": "i002",
					"item_name": "Milk (Fresh)",
					"section_id": "sec002",
					"is_completed": false,
					"last_modified": "2026-07-10T15:30:00Z",
					"operation": "update"
				},
				"client_version": {
					"item_id": "i002",
					"item_name": "Milk",
					"section_id": null,
					"is_completed": true,
					"last_modified": "2026-07-10T15:15:00Z",
					"operation": "delete"
				}
			}
		],
		"id_mapping": {
			"i999": "i003"
		},
		"synced_at": "2026-07-10T15:35:00Z"
	},
	"timestamp": "2026-07-10T15:35:00Z"
}
```

**Conflict Resolution Strategy:**

- **CREATE_CONFLICT:** Item already exists on server - server version kept, conflict reported
- **UPDATE_CONFLICT:** Server has newer changes - server version kept, conflict reported
- **DELETE_CONFLICT:** Server has newer changes - item not deleted, conflict reported

**Validation Errors (400):**

- `list_id` is required
- `client_items` must be an array
- Each item must have `item_id` and `operation`
- `operation` must be one of: create, update, delete
- For **create** operations: `item_name` is required
- For **update** operations: `item_name` is required
- For **update/delete** operations: `last_modified` is required and must be a valid timestamp
- `item_name` must be 1-200 characters (when provided)
- `section_id` must be valid if provided

**Error Responses:**

- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - List not found
- `400 Bad Request` - Validation error
- `500 Internal Server Error` - Server error

**Notes:**

- Items with identical client and server timestamps are considered equal; server version is authoritative on conflicts
- Timestamps must be ISO 8601 formatted strings
- Client must handle conflicts and perform retry sync if needed
- Returning all server items allows client to rebuild full state
- Operations not included in the sync are considered unchanged on client
- **ID Mapping (Phase 3.1 enhancement):** The `id_mapping` field tracks client-provided `item_id` → server-generated `item_id` for created items. Clients should use this to update local records: if client sent `{"item_id": "i999", "operation": "create", ...}` and receives `id_mapping: {"i999": "i003"}`, the client should replace all references to `i999` with `i003` in their local database to stay in sync with the server.

---

## Developer Endpoints (Phase 4)

### GET /developer/config

Get current server configuration. **Requires developer role.**

**Request:**

- Method: `GET`
- Headers: `Authorization: Bearer {token}`
- Body: None

**Response Codes:**

- `200 OK` - Configuration retrieved successfully
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have developer role
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": {
		"server": {
			"port": 3000,
			"env": "development"
		},
		"auth": {
			"bcrypt_rounds": 10,
			"password_min_length": 8,
			"session_expiry_days": 30,
			"session_rotation_days": 7
		},
		"limits": {
			"max_items_per_list": 1000,
			"max_sections_per_list": 50,
			"max_lists_per_user": 100,
			"max_username_length": 32,
			"max_list_name_length": 100,
			"max_item_name_length": 200,
			"max_section_name_length": 50
		},
		"rateLimit": {
			"enabled": true,
			"windowMs": 60000,
			"max": 100
		},
		"logging": {
			"level": "info"
		}
	},
	"timestamp": "2026-07-11T10:00:00Z"
}
```

**Response (403):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "FORBIDDEN",
		"message": "Developer role required"
	},
	"timestamp": "2026-07-11T10:00:00Z"
}
```

### POST /developer/config

Update server configuration values. **Requires developer role.**

**Request:**

- Method: `POST`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body:

```json
{
	"updates": {
		"server.port": 4000,
		"auth.password_min_length": 10,
		"limits.max_items_per_list": 2000
	}
}
```

**Allowed Configuration Keys:**

Safe configuration keys that can be updated:

- `server.port` - Server port (integer)
- `server.env` - Environment (string)
- `auth.bcrypt_rounds` - Bcrypt rounds for hashing (integer)
- `auth.password_min_length` - Minimum password length (integer)
- `auth.session_expiry_days` - Session expiration days (integer)
- `auth.session_rotation_days` - Session rotation days (integer)
- `limits.*` - All limit values (integers)
- `rateLimit.enabled` - Enable rate limiting (boolean)
- `rateLimit.windowMs` - Rate limit window (integer)
- `rateLimit.max` - Max requests per window (integer)
- `logging.level` - Log level (string)

**Protected Keys (Cannot be Updated):**

- `database.*` - Database configuration
- `auth.jwt_secret` - JWT secret key

**Response Codes:**

- `200 OK` - Configuration updated successfully
- `400 Bad Request` - Invalid key or value type
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have developer role
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": {
		"updated": true,
		"config": {
			"server": {
				"port": 4000,
				"env": "development"
			},
			"auth": {
				"bcrypt_rounds": 10,
				"password_min_length": 10,
				"session_expiry_days": 30,
				"session_rotation_days": 7
			},
			"limits": {
				"max_items_per_list": 2000,
				"max_sections_per_list": 50,
				"max_lists_per_user": 100,
				"max_username_length": 32,
				"max_list_name_length": 100,
				"max_item_name_length": 200,
				"max_section_name_length": 50
			},
			"rateLimit": {
				"enabled": true,
				"windowMs": 60000,
				"max": 100
			},
			"logging": {
				"level": "info"
			}
		}
	},
	"timestamp": "2026-07-11T10:00:00Z"
}
```

**Response (400 - Invalid Key):**

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "INVALID_CONFIG_KEY",
		"message": "Configuration key 'database.path' cannot be updated"
	},
	"timestamp": "2026-07-11T10:00:00Z"
}
```

### POST /developer/config/reload

Reload configuration from disk. **Requires developer role.**

**Request:**

- Method: `POST`
- Headers: `Authorization: Bearer {token}`
- Body: None

**Response Codes:**

- `200 OK` - Configuration reloaded successfully
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have developer role
- `500 Internal Server Error` - Server error

**Response (200):**

```json
{
	"success": true,
	"data": {
		"reloaded": true,
		"config": {
			"server": {
				"port": 3000,
				"env": "development"
			},
			"auth": {
				"bcrypt_rounds": 10,
				"password_min_length": 8,
				"session_expiry_days": 30,
				"session_rotation_days": 7
			},
			"limits": {
				"max_items_per_list": 1000,
				"max_sections_per_list": 50,
				"max_lists_per_user": 100,
				"max_username_length": 32,
				"max_list_name_length": 100,
				"max_item_name_length": 200,
				"max_section_name_length": 50
			},
			"rateLimit": {
				"enabled": true,
				"windowMs": 60000,
				"max": 100
			},
			"logging": {
				"level": "info"
			}
		}
	},
	"timestamp": "2026-07-11T10:00:00Z"
}
```

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
