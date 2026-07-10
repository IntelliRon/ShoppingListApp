# Shopping List App - Comprehensive Project Plan

**Project Date:** 2026-07-05  
**Status:** Phase 1 - Backend Core (In Progress)  
**Monorepo Structure:** App (Android) + Web (Backend/Developer UI)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Backend (Express Server) Specification](#backend-express-server-specification)
4. [Frontend (Android App) Specification](#frontend-android-app-specification)
5. [Database Design](#database-design)
6. [API Specification](#api-specification)
7. [Security Considerations](#security-considerations)
8. [Configuration & Defaults](#configuration--defaults)
9. [Developer UI](#developer-ui)
10. [Testing Strategy](#testing-strategy)
11. [CI/CD & GitHub Setup](#cicd--github-setup)
12. [Development Phases](#development-phases)
13. [Future Enhancements](#future-enhancements)

---

## Project Overview

### Purpose

A cross-platform shopping list application allowing users to:

- Create and manage multiple shopping lists
- Organize items by customizable sections
- Mark items as completed
- Sync state between local app and server
- Access from Android mobile app and web developer interface

### Key Constraints

- **Database Format:** CSV-based (flatfile)
- **Authentication:** Username/password with bcrypt hashing
- **Session Management:** Rotatable session keys with multi-day persistence
- **Deployment:** Monorepo (GitHub)
- **Configuration:** Global configurable limits via defaults file

### Scope

#### MVP-1 (Current Scope)

- User authentication and session management
- List CRUD operations
- Section management within lists
- Item CRUD operations
- Item completion tracking
- State synchronization
- Android client application
- API endpoints

#### MVP-2 (Future Scope)

- Web-based shopping list UI
- Forgot password functionality with email verification
- Enhanced developer dashboard

---

## Architecture Overview

```
ShoppingListApp/ (Monorepo Root)
├── App/
│   └── [Android Studio Project]
│       ├── app/
│       ├── gradle/
│       └── README-APP.md
├── Web/
│   ├── server/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── config/
│   │   └── db/
│   ├── developer-ui/
│   │   └── [Frontend for developer dashboard]
│   └── README-WEB.md
├── docs/
│   ├── API.md
│   └── DATABASE.md
├── PLAN.md (this file)
├── README.md
└── .github/
    └── workflows/
```

### Technology Stack

**Backend:**

- Node.js runtime
- Express.js web framework
- bcrypt for password hashing
- JWT or session tokens for authentication
- CSV files for data persistence
- Jest/Mocha for unit testing

**Frontend (Android):**

- Kotlin (native Android)
- Android Studio IDE
- Retrofit/OkHttp for API communication
- Local state management

**Developer UI:**

- React or vanilla JavaScript (TBD based on MVP-2 scope)
- Basic admin interface

---

## Backend (Express Server) Specification

### Core Responsibilities

1. **Authentication & Authorization**
    - User login/logout
    - Password management and hashing
    - Session token generation and rotation
    - Developer role verification

2. **API Gateway**
    - RESTful endpoints for all user operations
    - Request validation
    - Error handling
    - Response standardization

3. **Data Persistence**
    - CSV file I/O operations
    - Data consistency enforcement
    - Atomic operations for multi-item updates

### Constraints & Requirements

- **Session Rotation:** Session keys must be rotated periodically (recommend: every 7 days)
- **Multi-day Persistence:** Users remain logged in across multiple days
- **Last-Modified Tracking:** Each item must have a `last_modified` timestamp for sync reconciliation
- **Password Security:** All passwords hashed with bcrypt (salt rounds: 10+)
- **Rate Limiting:** Consider implementing for login attempts (future enhancement)

### Directory Structure

```
Web/server/
├── src/
│   ├── index.js                 # Application entry point
│   ├── app.js                    # Express app configuration
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js      # Global error handler
│   │   └── validation.js        # Request validation
│   ├── routes/
│   │   ├── auth.js              # Login, logout, register
│   │   ├── lists.js             # List CRUD operations
│   │   ├── sections.js          # Section management
│   │   ├── items.js             # Item CRUD operations
│   │   ├── sync.js              # Sync endpoint
│   │   └── developer.js         # Developer UI endpoints
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── listController.js
│   │   ├── sectionController.js
│   │   ├── itemController.js
│   │   └── syncController.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── listModel.js
│   │   ├── sectionModel.js
│   │   └── itemModel.js
│   ├── services/
│   │   ├── authService.js       # Hashing, token generation
│   │   ├── csvService.js        # File I/O operations
│   │   ├── syncService.js       # State reconciliation logic
│   │   └── configService.js     # Defaults loading/management
│   ├── utils/
│   │   ├── fileSystem.js        # File utilities
│   │   ├── validation.js        # Input validation rules
│   │   └── constants.js
│   ├── config/
│   │   ├── defaults.json        # Global configuration
│   │   └── database.js          # DB paths configuration
│   └── db/
│       ├── users.csv            # User database
│       └── shopping-lists/
│           └── {user-id}.csv    # Per-user shopping lists
├── tests/
│   ├── unit/
│   │   ├── authService.test.js
│   │   ├── csvService.test.js
│   │   ├── listController.test.js
│   │   └── itemController.test.js
│   ├── integration/
│   │   └── api.integration.test.js
│   └── fixtures/
│       └── testData.js
├── package.json
├── jest.config.js
├── .env.example
└── README-WEB.md
```

### Key Features

- **Graceful Error Handling:** All endpoints return consistent error responses
- **Request Logging:** Log all requests for debugging
- **CORS Configuration:** Properly configured for Android and web clients
- **Input Validation:** All inputs validated before processing

---

## Frontend (Android App) Specification

### Core Screens

1. **Login Screen**
    - Username input
    - Password input
    - Login button
    - Error message display
    - Persistent login option (checkbox)

2. **Home Screen (List of Shopping Lists)**
    - Display all shopping lists
    - Add new list button
    - User profile button (top right)
    - Sync status indicator

3. **Shopping List Detail Screen**
    - List title (editable via menu)
    - Sections with items grouped below each
    - "Checked Items" section (greyed out)
    - Add item button at bottom
    - Menu button (top right) with options:
        - Rename list
        - Delete list
        - Manage sections

4. **Add/Edit Item Dialog**
    - Item name input
    - Section dropdown (including "Ungrouped" option)
    - Add button
    - Cancel button

5. **Manage Sections Modal**
    - List of sections with edit/delete buttons
    - Add new section button
    - Rename section functionality
    - Remove section functionality (with item handling strategy)

6. **User Profile Screen**
    - Current username display
    - Edit username button
    - Change password section
    - Logout button

### Architecture Patterns

- **MVVM Pattern:** Recommended for Android development
- **Local Storage:** Store user session token and last sync state
- **Offline Support:** Queue operations when offline, sync when reconnected
- **State Management:** ViewModel-based state management using LiveData or Flow

### Directory Structure

```
App/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/intelliron/shoppinglist/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── ui/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── LoginActivity.kt
│   │   │   │   │   │   └── LoginViewModel.kt
│   │   │   │   │   ├── lists/
│   │   │   │   │   │   ├── ListsFragment.kt
│   │   │   │   │   │   ├── ListsViewModel.kt
│   │   │   │   │   │   ├── ListDetailFragment.kt
│   │   │   │   │   │   └── ListDetailViewModel.kt
│   │   │   │   │   ├── items/
│   │   │   │   │   │   ├── AddItemDialog.kt
│   │   │   │   │   │   └── ItemAdapter.kt
│   │   │   │   │   ├── sections/
│   │   │   │   │   │   ├── ManageSectionsDialog.kt
│   │   │   │   │   │   └── SectionAdapter.kt
│   │   │   │   │   └── profile/
│   │   │   │   │       ├── ProfileFragment.kt
│   │   │   │   │       └── ProfileViewModel.kt
│   │   │   │   ├── data/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   ├── ShoppingListApi.kt
│   │   │   │   │   │   └── RetrofitClient.kt
│   │   │   │   │   ├── local/
│   │   │   │   │   │   ├── SessionManager.kt
│   │   │   │   │   │   └── LocalDatabase.kt
│   │   │   │   │   ├── repository/
│   │   │   │   │   │   ├── AuthRepository.kt
│   │   │   │   │   │   ├── ListRepository.kt
│   │   │   │   │   │   └── ItemRepository.kt
│   │   │   │   │   └── models/
│   │   │   │   │       ├── User.kt
│   │   │   │   │       ├── ShoppingList.kt
│   │   │   │   │       ├── Section.kt
│   │   │   │   │       └── Item.kt
│   │   │   │   ├── utils/
│   │   │   │   │   ├── Constants.kt
│   │   │   │   │   ├── Extensions.kt
│   │   │   │   │   └── SyncManager.kt
│   │   │   │   └── di/
│   │   │   │       └── AppModule.kt (Dependency Injection setup)
│   │   │   └── res/
│   │   │       ├── layout/
│   │   │       ├── values/
│   │   │       └── drawable/
│   │   └── test/
│   │       └── [Unit tests]
│   └── build.gradle
├── gradle/
└── settings.gradle
```

### Key Libraries & Dependencies

- AndroidX / Jetpack
- Retrofit for HTTP requests
- OkHttp for HTTP client
- Coroutines for async operations
- LiveData/Flow for reactive state
- Dagger/Hilt for dependency injection
- Room (optional) for local caching

### Local Storage

- **Session Token:** Encrypted SharedPreferences
- **Last Sync Timestamp:** SharedPreferences
- **Pending Operations Queue:** Local SQLite database (for offline support)

---

## Database Design

### 1. Users Database (CSV)

**Location:** `Web/server/db/users.csv`

```csv
user_id,username,email,password_hash,created_at,last_login,is_developer,is_active
u001,john_doe,john@example.com,$2b$10$...,2026-01-15T08:00:00Z,2026-07-04T10:30:00Z,false,true
u002,admin_user,admin@example.com,$2b$10$...,2026-01-10T08:00:00Z,2026-07-04T09:15:00Z,true,true
```

**Fields:**

- `user_id` (string, unique): UUID or sequential ID
- `username` (string, unique): Username for login
- `email` (string, optional): Email address
- `password_hash` (string): Bcrypt hashed password
- `created_at` (ISO8601): Account creation timestamp
- `last_login` (ISO8601): Last login timestamp
- `is_developer` (boolean): Access to developer UI
- `is_active` (boolean): Account status

### 2. Shopping Lists Database (Per-User CSV)

**Location:** `Web/server/db/shopping-lists/{user_id}.csv`

```csv
list_id,list_name,created_at,last_modified,version
l001,Grocery Shopping,2026-01-20T10:00:00Z,2026-07-04T09:30:00Z,5
l002,Hardware Store,2026-02-01T14:15:00Z,2026-07-02T11:00:00Z,3
```

**Fields:**

- `list_id` (string, unique per user)
- `list_name` (string): Display name of list
- `created_at` (ISO8601): Creation timestamp
- `last_modified` (ISO8601): Last modification timestamp (for sync)
- `version` (integer): Version counter for concurrent update detection

### 3. Sections Database (Per-User CSV)

**Location:** `Web/server/db/shopping-lists/{user_id}_sections.csv`

```csv
section_id,list_id,section_name,sort_order,created_at,last_modified
sec001,l001,Produce,1,2026-01-20T10:00:00Z,2026-01-20T10:00:00Z
sec002,l001,Dairy,2,2026-01-20T10:05:00Z,2026-01-20T10:05:00Z
sec003,l001,Meat,3,2026-01-20T10:10:00Z,2026-01-20T10:10:00Z
```

**Fields:**

- `section_id` (string, unique per user)
- `list_id` (string): Associated shopping list
- `section_name` (string): Display name
- `sort_order` (integer): Ordering within list
- `created_at` (ISO8601): Creation timestamp
- `last_modified` (ISO8601): Last modification timestamp (for sync)

### 4. Items Database (Per-User CSV)

**Location:** `Web/server/db/shopping-lists/{user_id}_items.csv`

```csv
item_id,list_id,section_id,item_name,is_completed,created_at,last_modified
i001,l001,sec001,Apples,false,2026-01-20T10:00:00Z,2026-01-20T10:00:00Z
i002,l001,sec001,Bananas,true,2026-01-20T10:05:00Z,2026-01-21T08:30:00Z
i003,l001,,Milk,false,2026-01-20T10:10:00Z,2026-01-20T10:10:00Z
```

**Fields:**

- `item_id` (string, unique per user)
- `list_id` (string): Associated shopping list
- `section_id` (string or null): Associated section or null for ungrouped
- `item_name` (string): Item name
- `is_completed` (boolean): Checked status
- `created_at` (ISO8601): Creation timestamp
- `last_modified` (ISO8601): **Critical for sync**: Last modification timestamp (for reconciliation)

### 5. Session Management (In-Memory or File-Based)

**Location:** `Web/server/db/sessions.csv` (optional, can be in-memory for MVP)

```csv
session_id,user_id,token,created_at,last_accessed,expires_at,rotated_at
sess001,u001,eyJhbGc...,2026-07-01T10:00:00Z,2026-07-04T15:30:00Z,2026-07-11T10:00:00Z,2026-07-03T10:00:00Z
```

**Fields:**

- `session_id` (string, unique): Session identifier
- `user_id` (string): Associated user
- `token` (string): JWT or session token
- `created_at` (ISO8601): Session creation
- `last_accessed` (ISO8601): Last activity timestamp
- `expires_at` (ISO8601): Session expiration
- `rotated_at` (ISO8601): Last token rotation time

### Data Constraints & Validation

| Entity                | Constraint                                 |
| --------------------- | ------------------------------------------ |
| Username              | 3-32 characters, alphanumeric + underscore |
| Password              | Min 8 characters, hashed with bcrypt       |
| List Name             | 1-100 characters                           |
| Section Name          | 1-50 characters                            |
| Item Name             | 1-200 characters                           |
| Max Items per List    | Global config (default: 1000)              |
| Max Sections per List | Global config (default: 50)                |

### Data Persistence & CSV Service

**Implementation:** Single-writer pattern with per-file queue locking

- **Purpose:** Ensure thread-safe concurrent writes to CSV files
- **Mechanism:** File write queue manager maintains per-file Promise chains
    - Each file path maps to a write queue (Promise chain)
    - All write operations (`writeCSV`, `appendCSV`, `updateRecords`, `deleteRecords`) serialize through queue
    - Prevents race conditions and file corruption from concurrent writes
    - Transparent to callers - no API changes required
- **Behavior:**
    - Multiple concurrent requests to same file are queued and executed sequentially
    - Write operations block until previous writes complete
    - Read operations proceed independently (CSV parsing handles concurrent reads safely)
- **Status:** Implemented in Phase 1 (2026-07-05) - addresses potential data corruption from concurrent writes without external dependencies

---

## API Specification

### Base URL

```
http://localhost:3000/api/v1  (Development)
https://api.shoppinglist.intelliron.xyz/api/v1  (Production)
```

### Response Format

All responses follow this standard format:

```json
{
  "success": true,
  "data": {...},
  "error": null,
  "timestamp": "2026-07-04T10:30:00Z"
}
```

Error responses:

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "UNAUTHORIZED",
		"message": "Invalid credentials"
	},
	"timestamp": "2026-07-04T10:30:00Z"
}
```

### Authentication Endpoints

#### 1. Register User

```
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securePassword123",
  "email": "john_doe@example.com"
}

Response (201):
{
  "success": true,
  "data": {
    "user_id": "u_abc123def456...",
    "username": "john_doe",
    "email": "john_doe@example.com",
    "token": "eyJhbGc...",
    "created_at": "2026-07-04T10:30:00Z"
  }
}
```

#### 2. Login

```
POST /auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securePassword123"
}

Response (200):
{
  "success": true,
  "data": {
    "user_id": "u_abc123def456...",
    "username": "john_doe",
    "token": "eyJhbGc...",
  },
  "timestamp": "2026-07-04T10:30:00Z"
}
```

#### 3. Logout

```
POST /auth/logout
Authorization: Bearer {session_token}

Response (200):
{
  "success": true,
  "data": null,
  "timestamp": "2026-07-04T10:30:00Z"
}
```

#### 4. Change Password

```
POST /auth/change-password
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "old_password": "currentPassword123",
  "new_password": "newPassword456"
}

Response (200):
{
  "success": true,
  "data": null,
  "timestamp": "2026-07-04T10:30:00Z"
}
```

### Shopping List Endpoints

#### 5. Get All Lists

```
GET /lists
Authorization: Bearer {session_token}

Response (200):
{
  "success": true,
  "data": [
    {
      "list_id": "l001",
      "list_name": "Grocery Shopping",
      "created_at": "2026-01-20T10:00:00Z",
      "last_modified": "2026-07-04T09:30:00Z",
      "item_count": 15,
      "completed_count": 5
    }
  ]
}
```

#### 6. Create List

```
POST /lists
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "list_name": "Hardware Store"
}

Response (201):
{
  "success": true,
  "data": {
    "list_id": "l002",
    "list_name": "Hardware Store",
    "created_at": "2026-07-04T10:30:00Z",
    "updated_at": "2026-07-04T10:30:00Z"
  }
}
```

#### 7. Rename List

```
PUT /lists/{list_id}
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "list_name": "New Name"
}

Response (200):
{
  "success": true,
  "data": {
    "list_id": "l001",
    "list_name": "New Name",
    "last_modified": "2026-07-04T10:30:00Z"
  }
}
```

#### 8. Delete List

```
DELETE /lists/{list_id}
Authorization: Bearer {session_token}

Response (200):
{
  "success": true,
  "data": null
}
```

### Section Endpoints

#### 9. Get All Sections for List

```
GET /lists/{list_id}/sections
Authorization: Bearer {session_token}

Response (200):
{
  "success": true,
  "data": [
    {
      "section_id": "sec001",
      "section_name": "Produce",
      "sort_order": 1,
      "last_modified": "2026-01-20T10:00:00Z"
    }
  ]
}
```

#### 10. Add Section

```
POST /lists/{list_id}/sections
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "section_name": "Meat"
}

Response (201):
{
  "success": true,
  "data": {
    "section_id": "sec003",
    "section_name": "Meat",
    "sort_order": 3,
    "last_modified": "2026-07-04T10:30:00Z"
  }
}
```

#### 11. Rename Section

```
PUT /lists/{list_id}/sections/{section_id}
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "section_name": "Poultry"
}

Response (200):
{
  "success": true,
  "data": {
    "section_id": "sec003",
    "section_name": "Poultry",
    "last_modified": "2026-07-04T10:30:00Z"
  }
}
```

#### 12. Delete Section

```
DELETE /lists/{list_id}/sections/{section_id}
Authorization: Bearer {session_token}

Response (200):
{
  "success": true,
  "data": null
}
```

### Item Endpoints

#### 13. Get All Items for List

```
GET /lists/{list_id}/items
Authorization: Bearer {session_token}

Response (200):
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
    }
  ]
}
```

#### 14. Add Item

```
POST /lists/{list_id}/items
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "item_name": "Carrots",
  "section_id": "sec001"  // or null for ungrouped
}

Response (201):
{
  "success": true,
  "data": {
    "item_id": "i004",
    "item_name": "Carrots",
    "section_id": "sec001",
    "is_completed": false,
    "created_at": "2026-07-04T10:30:00Z",
    "last_modified": "2026-07-04T10:30:00Z"
  }
}
```

#### 15. Update Item (Rename, Change Section, Toggle Completion)

```
PUT /lists/{list_id}/items/{item_id}
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "item_name": "Carrots",        // optional
  "section_id": "sec002",        // optional
  "is_completed": true           // optional
}

Response (200):
{
  "success": true,
  "data": {
    "item_id": "i004",
    "item_name": "Carrots",
    "section_id": "sec002",
    "is_completed": true,
    "last_modified": "2026-07-04T10:35:00Z"
  }
}
```

#### 16. Delete Item

```
DELETE /lists/{list_id}/items/{item_id}
Authorization: Bearer {session_token}

Response (200):
{
  "success": true,
  "data": null
}
```

### Sync Endpoint

#### 17. Sync Items (Client-Server Reconciliation)

```
POST /sync/items
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "list_id": "l001",
  "client_items": [
    {
      "item_id": "i001",
      "item_name": "Apples",
      "is_completed": false,
      "last_modified": "2026-07-04T10:00:00Z",
      "operation": "update"  // create, update, delete
    }
  ],
  "last_sync": "2026-07-04T09:00:00Z"
}

Response (200):
{
  "success": true,
  "data": {
    "server_items": [...],
    "conflicts": [],
    "synced_at": "2026-07-04T10:30:00Z"
  }
}
```

### Developer Endpoints

#### 18. Get Configuration

```
GET /developer/config
Authorization: Bearer {session_token}
(user must have is_developer = true)

Response (200):
{
  "success": true,
  "data": {
    "max_items_per_list": 1000,
    "max_sections_per_list": 50,
    "session_rotation_days": 7,
    "session_expiry_days": 30
  }
}
```

#### 19. Update Configuration

```
POST /developer/config
Authorization: Bearer {session_token}
Content-Type: application/json
(user must have is_developer = true)

{
  "max_items_per_list": 2000,
  "max_sections_per_list": 100
}

Response (200):
{
  "success": true,
  "data": {
    "updated": true,
    "config": {...}
  }
}
```

#### 20. Reload Configuration (Runtime)

```
POST /developer/config/reload
Authorization: Bearer {session_token}
(user must have is_developer = true)

Response (200):
{
  "success": true,
  "data": {
    "reloaded": true,
    "config": {...}
  }
}
```

### Health Check Endpoint

#### 21. Health Check (No Authentication Required)

```
GET /api/v1/health

Response (200 - Healthy):
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-07-04T10:30:00Z",
    "uptime": 3600,
    "environment": "production",
    "checks": {
      "database": "ok",
      "csvAccess": "ok"
    }
  }
}

Response (503 - Unhealthy):
{
  "success": false,
  "data": null,
  "error": {
    "code": "HEALTH_CHECK_FAILED",
    "message": "Database or file system check failed"
  },
  "timestamp": "2026-07-04T10:30:00Z"
}
```

**Purpose:** Used by load balancers, monitoring systems, and deployment health checks to verify:

- Server process is running
- CSV database directory is accessible
- Basic file system permissions are correct
- Server has been running for how long (uptime)
- Current environment (development/production)

**Implementation Notes:**

- No authentication required (should be accessible without credentials)
- Returns 200 if all checks pass
- Returns 503 if any check fails
- Used by deployment script to verify successful restarts

---

## Security Considerations

### Authentication & Authorization

1. **Password Storage**
    - Hash using bcrypt with salt rounds ≥ 10
    - Never store plain text passwords
    - Validate password strength (min 8 chars, mixed case recommended)

2. **Session Tokens**
    - Use JWT (JSON Web Tokens) or secure session IDs
    - Include user ID and expiration in token
    - Sign tokens with a strong secret key
    - **Token Expiration:** Tokens expire after 30 days
    - **JWT Secret Requirement:** Must set `JWT_SECRET` environment variable in production (defaults to placeholder in development only)
    - **Note:** Token rotation is deferred to MVP-2 (refresh tokens, session ID rotation to be implemented later)

3. **Authorization Checks**
    - Verify token validity on every request
    - Ensure user can only access their own data
    - Verify developer role for admin endpoints

### API Security

1. **HTTPS/TLS**
    - Use HTTPS in production
    - Use HTTP in development
    - Enforce HTTPS with HSTS headers

2. **CORS Configuration**
    - Whitelist Android app origin (if applicable)
    - Whitelist developer UI origin
    - Disable credentials if not needed

3. **Rate Limiting**
    - Implement rate limiting on login endpoint (prevent brute force)
    - Recommend: 5 failed attempts = 15-minute lockout
    - Global rate limiting: 100 requests/minute per user

4. **Input Validation**
    - Validate all user inputs
    - Sanitize inputs to prevent injection attacks
    - Use strict type checking

5. **Error Messages**
    - Don't expose sensitive information in error messages
    - Return generic messages to prevent user enumeration

### Data Security

1. **CSV File Security**
    - Restrict file permissions (user read/write only)
    - Consider encrypting CSV files at rest (future enhancement)
    - Backup strategy for data recovery

2. **Sync Security**
    - Use `last_modified` timestamps for conflict resolution
    - Implement optimistic locking to prevent data loss
    - Log all sync operations

### Development Considerations

1. **Developer Account Management**
    - Manually assign `is_developer` flag in database
    - Implement strong authentication for developer endpoints
    - Audit trail for configuration changes

2. **Secrets Management**
    - Use `.env` files for local development (NOT committed)
    - **Critical for Production:** Set environment variables: `JWT_SECRET` (required — no default), and optionally others
    - Application will warn if default JWT secret used in production environments
    - Rotate secrets regularly

3. **Logging**
    - Log authentication events
    - Log data modifications
    - Don't log sensitive data (passwords, tokens)

---

## Configuration & Defaults

### Configuration File Location

```
Web/server/src/config/defaults.json
```

### Default Configuration

```json
{
	"server": {
		"port": 3000,
		"env": "development",
		"cors": {
			"origin": ["http://localhost:8080", "http://localhost:3001"],
			"credentials": true
		}
	},
	"database": {
		"path": "./db",
		"users_file": "./db/users.csv",
		"sessions_file": "./db/sessions.csv",
		"shopping_lists_dir": "./db/shopping-lists"
	},
	"auth": {
		"bcrypt_rounds": 10,
		"password_min_length": 8,
		"session_expiry_days": 30,
		"session_rotation_days": 7,
		"jwt_secret": "your-secret-key-change-in-production"
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
		"windowMs": 900000,
		"max": 100,
		"skipSuccessfulRequests": false
	},
	"logging": {
		"level": "info",
		"format": "json"
	}
}
```

**Note:** `session_rotation_days` is configured but currently unused in Phase 1 — token rotation will be implemented in MVP-2.

### Environment-Specific Configs

Create environment-specific files:

- `defaults.development.json`
- `defaults.production.json`
- `defaults.staging.json`

Load based on `NODE_ENV` variable.

### Configuration Management Service

The `configService.js` will:

- Load defaults from JSON on startup
- Provide getters for configuration values
- Allow runtime updates via developer endpoints
- Persist changes to defaults.json

---

## Developer UI

### Purpose

Accessible only to users with `is_developer = true`, this web interface allows developers to:

- View current configuration
- Update configuration values
- Reload configuration into running server
- View server logs
- Manage users (future enhancement)

### Access

```
http://localhost:3001/developer
```

### Features (MVP-1)

1. **Configuration Editor**
    - Display current defaults.json values
    - Allow inline editing of configuration
    - Save button to persist changes
    - Reload button to apply changes to running server

2. **Status Dashboard**
    - Server uptime
    - Number of active users
    - Recent activity log

3. **Authentication**
    - Login form (uses standard user credentials + is_developer flag)
    - Session management

### Technology Stack

- Simple HTML/CSS/JavaScript (or lightweight framework)
- Fetch API for communication with backend
- LocalStorage for session persistence

### Directory Structure

```
Web/developer-ui/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── auth.js
│   └── config.js
└── assets/
    └── logo.png
```

---

## Testing Strategy

### Unit Tests

**Coverage Target:** ≥ 80%

**Key Areas:**

- Authentication service (password hashing, token generation)
- CSV service (file I/O, data parsing)
- Data validation functions
- List/section/item operations
- Sync logic

**Framework:** Jest  
**Location:** `Web/server/tests/unit/`

Example test file structure:

```javascript
// authService.test.js
describe("AuthService", () => {
	describe("hashPassword", () => {
		it("should return a hashed password different from input", () => {
			// Test implementation
		});
	});
});
```

### Integration Tests

**Purpose:** Verify API endpoints work correctly with real CSV files

**Key Endpoints to Test:**

- Login/logout flow
- Create/read/update/delete operations
- Sync endpoint with conflict resolution
- Authorization checks

**Framework:** Jest with supertest  
**Location:** `Web/server/tests/integration/`

### Test Data Fixtures

**Location:** `Web/server/tests/fixtures/`

- Sample CSV data
- Mock users
- Pre-populated lists

### Running Tests

```bash
npm test                    # Run all tests
npm run test:unit          # Run only unit tests
npm run test:integration   # Run only integration tests
npm run test:coverage      # Generate coverage report
```

### CI/CD Test Execution

Tests automatically run on:

- Pull request creation
- Push to master branch
- Before deployment

---

## CI/CD & GitHub Setup

### Repository Structure

```
ShoppingListApp/
├── .github/
│   └── workflows/
│       ├── test.yml              # Run tests on PR/push
│       ├── lint.yml              # Code quality checks
│       └── deploy.yml            # Deployment workflow
├── App/
├── Web/
├── PLAN.md
├── README.md
└── .gitignore
```

### GitHub Actions Workflows

#### 1. Test Workflow (test.yml)

Triggers on:

- Pull requests
- Push to `master` and `develop` branches

Steps:

1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run linter
5. Run unit tests
6. Run integration tests
7. Generate coverage report
8. Post coverage as PR comment (using open source action like `romeovs/lcov-reporter-action`)

#### 2. Lint Workflow (lint.yml)

- ESLint for code quality
- Prettier for formatting

#### 3. Deployment Workflow (deploy.yml)

Automated deployment via GitHub Actions SSH (triggers on push to `master` branch)

**Workflow Steps:**

1. Checkout code from repo
2. SSH into production server
3. Pull latest code to server
4. Execute deployment script from repo (`.github/scripts/deploy.sh`)
5. Verify health via API endpoint
6. Post deployment status to GitHub

**Deployment Script** (stored in repo at `.github/scripts/deploy.sh`):

```bash
#!/bin/bash
set -e

PROJECT_DIR="/path/to/ShoppingListApp"
API_NAME="shopping-list-api"

echo "[$(date)] Starting deployment..."

# Navigate to project
cd "$PROJECT_DIR"

# Fetch latest code
git pull origin main

# Install/update dependencies
npm install --production

# Restart or start PM2 process
if pm2 list | grep -q "$API_NAME"; then
    echo "[$(date)] Restarting PM2 process..."
    pm2 restart "$API_NAME"
else
    echo "[$(date)] Starting new PM2 process..."
    pm2 start Web/server/src/index.js --name "$API_NAME" --env production
fi

# Save PM2 state for auto-restart on server reboot
pm2 save

# Give app a moment to start
sleep 3

# Health check
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.shoppinglist.intelliron.xyz/api/v1/health || echo "000")

if [ "$RESPONSE" == "200" ]; then
    echo "[$(date)] ✓ Deployment successful! API is responding."
    exit 0
else
    echo "[$(date)] ✗ Deployment failed! API health check returned: $RESPONSE"
    exit 1
fi
```

**GitHub Actions Workflow** (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Production

on:
    push:
        branches:
            - main

jobs:
    deploy:
        runs-on: ubuntu-latest
        environment: production

        steps:
            - name: Checkout code
              uses: actions/checkout@v3
              with:
                  fetch-depth: 0

            - name: Deploy via SSH
              uses: appleboy/ssh-action@master
              with:
                  host: ${{ secrets.DEPLOY_HOST }}
                  username: ${{ secrets.DEPLOY_USER }}
                  key: ${{ secrets.DEPLOY_SSH_KEY }}
                  port: ${{ secrets.DEPLOY_PORT || '22' }}
                  script: |
                      cd ${{ secrets.DEPLOY_DIR }}
                      bash .github/scripts/deploy.sh

            - name: Post deployment status
              if: always()
              uses: actions/github-script@v6
              with:
                  github-token: ${{ secrets.GITHUB_TOKEN }}
                  script: |
                      github.rest.repos.createCommitStatus({
                        owner: context.repo.owner,
                        repo: context.repo.repo,
                        sha: context.sha,
                        state: '${{ job.status }}',
                        context: 'Deployment to Production',
                        target_url: 'https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}'
                      });
```

**GitHub Secrets Required:**

- `DEPLOY_HOST`: Your server IP or domain
- `DEPLOY_USER`: SSH user (e.g., `ubuntu`, `ec2-user`, `deploy`)
- `DEPLOY_SSH_KEY`: Your private SSH key (paste entire key including `-----BEGIN PRIVATE KEY-----` lines)
- `DEPLOY_DIR`: Full path to project directory on server (e.g., `/home/deploy/ShoppingListApp`)
- `DEPLOY_PORT` (optional): SSH port if not default 22

**Server Setup (One-time Only):**

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/ShoppingListApp.git /path/to/ShoppingListApp
    cd /path/to/ShoppingListApp
    ```

2. Generate SSH key pair for GitHub Actions (on your local machine):

    ```bash
    ssh-keygen -t ed25519 -f github-actions-deploy -C "github-actions-deploy"
    # Don't set a passphrase
    ```

3. Add public key to server `authorized_keys`:

    ```bash
    cat github-actions-deploy.pub >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
    ```

4. Add private key to GitHub repo secrets:
    - Go to repo Settings → Secrets and variables → Actions → New repository secret
    - Name: `DEPLOY_SSH_KEY`
    - Value: Paste entire contents of `github-actions-deploy` (private key)

5. Install Node.js and PM2 on server:

    ```bash
    # Install Node.js (Ubuntu/Debian)
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Install PM2 globally
    sudo npm install -g pm2

    # Set up PM2 to start on reboot
    pm2 startup
    pm2 save
    ```

6. Make deployment script executable:

    ```bash
    chmod +x /path/to/ShoppingListApp/.github/scripts/deploy.sh
    ```

7. Create meaningful health check endpoint in your Express app (add to `Web/server/src/app.js`):
    ```javascript
    const fs = require("fs");
    const config = require("./config/defaults.json");

    app.get("/api/v1/health", (req, res) => {
    	try {
    		// Verify CSV database directory is accessible
    		const dbPath = config.database.path || "./db";
    		fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);

    		res.status(200).json({
    			success: true,
    			data: {
    				status: "healthy",
    				timestamp: new Date().toISOString(),
    				uptime: Math.floor(process.uptime()),
    				environment: process.env.NODE_ENV || "development",
    				checks: {
    					database: "ok",
    					csvAccess: "ok",
    				},
    			},
    		});
    	} catch (error) {
    		res.status(503).json({
    			success: false,
    			data: null,
    			error: {
    				code: "HEALTH_CHECK_FAILED",
    				message: "Database or file system check failed",
    			},
    			timestamp: new Date().toISOString(),
    		});
    	}
    });
    ```

**Deployment Flow:**

1. Developer pushes code to `master` branch
2. GitHub Actions automatically triggers `deploy.yml` workflow
3. Workflow uses SSH to connect to your server
4. Server pulls latest code from `master` branch
5. Deployment script (from repo) executes: installs deps, restarts PM2
6. Health check verifies API is responding
7. Deployment status posted back to GitHub commit

**Infrastructure:**

- **GitHub:** Repository and CI/CD orchestration
- **GitHub Actions:** Automated deployment trigger and SSH orchestration
- **Your Server:** Runs Node.js app via PM2
- **Nginx:** Reverse proxy router (routes traffic to API subdomain)
- **PM2:** Process manager for Node.js persistence and auto-restart
- **Cloudflare:** DNS and SSL/TLS termination on top
- **SSH:** Secure communication between GitHub Actions and server

### Branch Strategy

- `master`: Production-ready code (default branch)
- `develop`: Integration branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Urgent production fixes

### Pull Request Requirements

- ✅ All tests pass
- ✅ Code coverage maintained/improved
- ✅ Linting passes
- ✅ Self-reviewed
- ✅ Linked to issue

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:

```
feat(auth): implement session token rotation

Add automatic session token rotation every 7 days
as per security requirements.

Closes #42
```

---

## Development Phases

### Phase 0: Project Setup (Week 1)

- [x] Initialize GitHub repository (monorepo structure)
- [x] Create project folder structure
- [x] Set up Node.js project with dependencies
- [ ] Set up Android Studio project
- [x] Create README files
- [x] Set up GitHub Actions workflows
- [x] Create .gitignore and .env.example

### Phase 1: Backend Core (Weeks 2-3)

- [x] Implement Express app structure
- [x] Create CSV file I/O service (with single-writer pattern for concurrency)
- [x] Implement authentication (login/register/logout)
- [x] Password hashing with bcrypt
- [x] JWT/session token generation
- [x] User database (users.csv)
- [x] Unit tests for auth service (43/43 tests passing)
- [x] Authentication middleware (requireAuth, requireDeveloper, optionalAuth)
- [x] Authentication routes (register, login, logout, change-password)
- [x] Error handling middleware (2026-07-05)

### Phase 2: Backend API - Lists & Sections (Weeks 4-5)

- [ ] List CRUD endpoints
- [ ] Section CRUD endpoints
- [ ] Authorization middleware
- [ ] Data validation
- [ ] Integration tests for list endpoints
- [ ] CSV operations for lists/sections

### Phase 3: Backend API - Items & Sync (Weeks 6-7)

- [ ] Item CRUD endpoints
- [ ] Item completion toggle
- [ ] Sync endpoint with conflict resolution
- [ ] Last-modified timestamp tracking
- [ ] Integration tests for items
- [ ] Sync logic unit tests

### Phase 4: Backend Configuration & Developer UI (Week 8)

- [ ] Configuration service
- [ ] Developer endpoints (get/update/reload config)
- [ ] Developer authentication check
- [ ] Basic developer UI (HTML/CSS/JS)
- [ ] Configuration editor UI
- [ ] API integration for config management

### Phase 5: Android Frontend - Auth & Lists (Weeks 9-10)

- [ ] Login screen UI
- [ ] API client setup (Retrofit)
- [ ] Session token storage
- [ ] Authentication flow
- [ ] Lists screen UI
- [ ] List creation and deletion

### Phase 6: Android Frontend - Items & Sync (Weeks 11-12)

- [ ] Shopping list detail screen
- [ ] Item management UI
- [ ] Section management UI
- [ ] Item completion toggle
- [ ] Sync logic implementation
- [ ] Offline queue handling

### Phase 7: Android Frontend - Profile & Polish (Week 13)

- [ ] User profile screen
- [ ] Password change functionality
- [ ] Error handling and user feedback
- [ ] UI polish and testing
- [ ] Performance optimization

### Phase 8: Testing & Deployment (Week 14-15)

- [ ] End-to-end testing
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation completion
- [ ] Prepare for production deployment
- [ ] Final code review

### Phase 9: MVP-1 Release (Week 16)

- [ ] Final testing and bug fixes
- [ ] Release notes
- [ ] Public launch

---

## Future Enhancements

### MVP-2: Web UI & Enhanced Features

1. **Web-Based Shopping List UI**
    - React/Vue component-based interface
    - Responsive design for desktop and tablet
    - Real-time collaboration (WebSockets)
    - Share lists with other users

2. **Password Reset Functionality**
    - Email integration for reset links
    - One-time password (OTP) links
    - Email verification
    - Security considerations:
        - Token expiration (15 minutes)
        - Token invalidation after use
        - Rate limiting on reset requests

3. **Advanced Developer Dashboard**
    - User management interface
    - System monitoring and metrics
    - Audit logs
    - Performance analytics

### Token Blacklist & Enhanced Logout (Future Consideration)

**Current MVP Approach:**

- Logout invalidation handled on client side (token discarded)
- No server-side token blacklist maintained
- Simple and scalable for initial release

**Future Enhancement Options:**

1. **Redis-based blacklist** - Fast in-memory token invalidation
    - Store revoked tokens with expiration matching JWT exp claim
    - Check blacklist on protected endpoints
    - Suitable for medium-scale deployments

2. **Database-backed blacklist** - Persistent token tracking
    - Maintain `revoked_tokens.csv` or similar
    - Trade-off: Simpler than Redis but slower checks
    - Good for audit compliance requirements

3. **Short-lived refresh tokens** - Enhanced security pattern
    - Short access tokens (15 min) + long refresh tokens (30 days)
    - Requires token refresh mechanism
    - Reduces token blacklist size and check frequency

**Decision:** Deferred to MVP-2. Current JWT-only approach sufficient for MVP-1 as users can clear token client-side.

### MVP-3 & Beyond

- [ ] Real-time sync using WebSockets
- [ ] Collaborative lists with sharing
- [ ] Recurring shopping lists
- [ ] Shopping analytics and recommendations
- [ ] Multi-device sync
- [ ] Desktop application
- [ ] Push notifications
- [ ] Cloud backup of data

---

## Key Decisions & Rationale

| Decision                   | Rationale                                                                |
| -------------------------- | ------------------------------------------------------------------------ |
| CSV-based database         | Simple, no external dependencies, easy to version control and backup     |
| Node.js/Express backend    | Quick to set up, extensive npm ecosystem, good for REST APIs             |
| Android native (Kotlin)    | Better performance and user experience vs. cross-platform solutions      |
| JWT for sessions           | Stateless, scalable, suitable for REST APIs                              |
| Token rotation (MVP-2)     | Enhanced security best practice — deferred to Phase 2 for MVP-1 focus    |
| Per-user CSV files         | Better scalability than single-file database, easier user data isolation |
| Monorepo structure         | Easier project management, shared documentation, atomic commits          |
| AsyncLocalStorage tracking | Ensures external reads wait for writes while nested reads avoid deadlock |
| Atomic read-then-write     | All CSV operations (append, update, delete) use per-file queuing         |

---

## Success Criteria

- ✅ All MVP-1 features implemented and working
- ✅ ≥80% test coverage
- ✅ No critical security vulnerabilities
- ✅ All GitHub Actions tests pass
- ✅ Application runs without errors
- ✅ Clean, well-documented code
- ✅ README documentation complete
- ✅ User can complete full workflow: login → create list → add items → sync → logout

---

## Getting Started

1. Clone the repository
2. Follow setup instructions in [README.md](README.md)
3. See [Web/README-WEB.md](Web/README-WEB.md) for backend setup
4. See [App/README-APP.md](App/README-APP.md) for Android app setup

---

## Document History

| Date       | Author       | Changes                                                                                                                        |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-05 | IntelliRon   | Phase 1 status update, authentication architecture, CSV persistence with single-writer pattern, configuration path corrections |
| 2026-07-04 | Project Team | Initial plan created                                                                                                           |

---

**Next Step:** Begin Phase 0 - Project Setup
