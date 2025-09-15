#!/bin/bash
set -e

# Simple deployment script for local server

echo "Building Angular frontend..."
npm --prefix choir-app-frontend run build

echo "Checking backend..."
npm --prefix choir-app-backend run check

# Install backend dependencies and restart process manager
npm --prefix choir-app-backend install >/dev/null 2>&1 || true

LOG_FILE="choir-app-backend/logs/exceptions.log"

echo "Restarting backend..."
pm2 restart chorleiter-api || true

echo "Checking backend status..."
if ! pm2 describe chorleiter-api | grep -qi 'status.*online' >/dev/null 2>&1; then
    echo "Backend failed to start. Recent log output:"
    tail -n 20 "$LOG_FILE" 2>/dev/null || echo "No exceptions log found"
    exit 1
fi

echo "Deployment completed."
