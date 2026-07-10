# Shopping List App

A cross-platform shopping list application with a Node.js/Express backend and Android mobile frontend.

## Project Structure

```
ShoppingListApp/
├── App/                    # Android application
├── Web/                    # Backend and developer UI
│   ├── server/            # Express API server
│   └── developer-ui/      # Configuration dashboard
├── docs/                  # Documentation
├── PLAN.md               # Comprehensive project plan
└── README.md             # This file
```

## Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- Git

### Backend Setup

```bash
# Navigate to server directory
cd Web/server

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Start development server
npm run dev
```

Server will be available at `http://localhost:3000`

### Frontend Setup (Android)

Requires Android Studio 2021.1+. See [App/README-APP.md](App/README-APP.md) for detailed setup instructions.

## Key Features (MVP-1)

- ✅ User authentication with JWT tokens
- ✅ Multiple shopping lists per user
- ✅ Item organization with customizable sections
- ✅ Item completion tracking
- ✅ Server-client state synchronization
- ✅ Developer configuration dashboard

## Documentation

- [PLAN.md](PLAN.md) - Complete project specification and architecture
- [Web/README-WEB.md](Web/README-WEB.md) - Backend development guide
- [App/README-APP.md](App/README-APP.md) - Android development guide
- [docs/](docs/) - Additional documentation

## Development

### Running Tests

```bash
cd Web/server
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:coverage      # With coverage report
```

### Code Quality

```bash
npm run lint               # Check code style
npm run lint:fix           # Auto-fix style issues
```

## Technology Stack

**Backend:**

- Node.js with Express.js
- CSV-based persistence
- JWT for authentication
- bcryptjs for password hashing

**Frontend (Android):**

- Kotlin (native Android)
- Retrofit for API communication
- MVVM architecture pattern

## API Documentation

**Complete API documentation:** [docs/API.md](docs/API.md)

Includes:

- Authentication endpoints (register, login, logout, change-password)
- Shopping list CRUD operations
- Section management
- Health check endpoint
- Request/response examples for all endpoints
- Error codes and data constraints

**Development Base URL:** `http://localhost:3000/api/v1`
**Production Base URL:** `https://api.shoppinglist.intelliron.xyz/api/v1`

## Status

**Current Phase:** Phase 2 - Backend API: Lists & Sections (Complete)

### Completed Features

- ✅ Phase 1: Backend Core (Authentication, JWT, file locking)
- ✅ Phase 2: Lists & Sections CRUD (Create, read, update, delete operations)
- ✅ Authorization & per-user data isolation
- ✅ Input validation using config limits
- ✅ 127 passing tests across 7 test suites
- ✅ Comprehensive API documentation

### In Development

- 🔄 Phase 3: Items & Sync (Item CRUD, completion toggle, client-server sync with conflict resolution)

### Upcoming

- 📋 Phase 4: Android Frontend implementation
- 📋 MVP-2: Advanced features (token rotation, offline sync, etc.)

**Project Date:** 2026-07-10

## License

MIT

## Getting Help

Refer to the comprehensive [PLAN.md](PLAN.md) for detailed specifications, architecture decisions, and development phases.
