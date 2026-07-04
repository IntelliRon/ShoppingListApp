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

## API

All endpoints documented in [PLAN.md - API Specification](PLAN.md#api-specification)

Base URL: `https://api.shoppinglist.intelliron.xyz/api/v1`

## Status

**Current Phase:** Phase 0 - Project Setup  
**Project Date:** 2026-07-04

## License

MIT

## Getting Help

Refer to the comprehensive [PLAN.md](PLAN.md) for detailed specifications, architecture decisions, and development phases.
