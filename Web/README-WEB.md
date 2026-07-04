# Web Backend & Developer UI

## Backend (Express API Server)

### Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

### Project Structure

```
server/
├── src/
│   ├── index.js                 # Entry point
│   ├── app.js                   # Express configuration
│   ├── middleware/              # Request middlewares
│   ├── routes/                  # API route handlers
│   ├── controllers/             # Business logic
│   ├── models/                  # Data models
│   ├── services/                # Core services
│   ├── utils/                   # Utility functions
│   ├── config/                  # Configuration
│   └── db/                      # Database files
├── tests/                       # Test suites
├── package.json
└── jest.config.js
```

### Development Workflow

1. **Local Development**
   - Run `npm run dev` for auto-reload with nodemon
   - Tests run automatically on code changes
   - Check logs for errors

2. **Testing**
   ```bash
   npm test                       # Run all tests
   npm run test:coverage         # Generate coverage
   ```

3. **Linting**
   ```bash
   npm run lint                  # Check code
   npm run lint:fix              # Auto-fix issues
   ```

### Environment Variables

See `.env.example` for all available options. Key variables:

- `NODE_ENV` - development/production
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for token signing
- `DATABASE_PATH` - Path to database files

### API Endpoints

All 21 endpoints documented in main [PLAN.md](../PLAN.md#api-specification)

**Health Check:** `GET /api/v1/health` (no auth required)

### Database

CSV-based persistence located in `src/db/`:

- `users.csv` - User accounts
- `sessions.csv` - Active sessions
- `shopping-lists/{user_id}.csv` - User shopping lists
- `shopping-lists/{user_id}_items.csv` - List items
- `shopping-lists/{user_id}_sections.csv` - Item sections

## Developer UI

Web-based dashboard for configuration management.

### Features

- View/edit server configuration
- Runtime config updates
- Server status monitoring

### Access

```
http://localhost:3001/developer
```

### Architecture

```
developer-ui/
├── index.html              # Main page
├── css/
│   └── styles.css         # Styling
├── js/
│   ├── app.js             # Main app logic
│   ├── auth.js            # Authentication
│   └── config.js          # Config management
└── assets/                # Images/icons
```

### Build & Deploy

Developer UI is static files served from backend during development.

## Deployment

See [PLAN.md - CI/CD & GitHub Setup](../PLAN.md#cicd--github-setup) for deployment instructions.

## Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env or use environment variable
PORT=3001 npm run dev
```

**Database files missing:**
```bash
# Files are created automatically on first run
# Ensure src/db/ directory exists and is writable
```

**Tests failing:**
```bash
# Clear Jest cache
npx jest --clearCache
npm test
```
