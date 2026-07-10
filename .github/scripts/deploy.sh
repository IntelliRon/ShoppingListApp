#!/bin/bash
set -e

# Get the script's directory and use it as project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
API_NAME="shopping-list-api"

echo "[$(date)] Starting deployment..."

# Navigate to project
cd "$PROJECT_DIR"

# Fetch latest code
git pull origin master

# Install/update dependencies
cd Web/server
npm ci
npm run lint
npm test
npm prune --omit=dev

# Navigate back to project root
cd "$PROJECT_DIR"

# Stop old PM2 process if running
pm2 stop "$API_NAME" 2>/dev/null || true

# Start/restart PM2 process
echo "[$(date)] Starting PM2 process..."
if pm2 describe "$API_NAME" >/dev/null 2>&1; then
	NODE_ENV=production pm2 restart "$API_NAME"
else
	NODE_ENV=production pm2 start Web/server/src/index.js --name "$API_NAME"
fi
# Save PM2 state for auto-restart on server reboot
pm2 save

# Give app a moment to start
sleep 3

# Health check (localhost since we're on the server)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health || echo "000")

if [ "$RESPONSE" == "200" ]; then
    echo "[$(date)] ✓ Deployment successful! API is responding."
    exit 0
else
    echo "[$(date)] ✗ Deployment failed! API health check returned: $RESPONSE"
    exit 1
fi
