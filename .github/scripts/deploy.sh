#!/bin/bash
set -e

PROJECT_DIR="/path/to/ShoppingListApp"
API_NAME="shopping-list-api"

echo "[$(date)] Starting deployment..."

# Navigate to project
cd "$PROJECT_DIR"

# Fetch latest code
git pull origin master

# Install/update dependencies
npm install --production --prefix Web/server

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
