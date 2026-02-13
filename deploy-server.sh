#!/bin/bash
set -e

# Parse command line options
BUILD_FRONTEND=false
BUILD_BACKEND=false

# If no arguments provided, default to all
if [ $# -eq 0 ]; then
    BUILD_FRONTEND=true
    BUILD_BACKEND=true
else
    # Parse provided arguments
    for arg in "$@"; do
        case "$arg" in
            -frontend) BUILD_FRONTEND=true ;;
            -backend) BUILD_BACKEND=true ;;
            *) echo "Unknown option: $arg" >&2; exit 1 ;;
        esac
    done
fi

echo "Deploy options: Frontend=$BUILD_FRONTEND Backend=$BUILD_BACKEND"

# Simple deployment script for local server

if [ "$BUILD_FRONTEND" = true ]; then
    echo "Building Angular frontend..."
    npm --prefix choir-app-frontend run build
fi

if [ "$BUILD_BACKEND" = true ]; then
    echo "Checking backend..."
    npm --prefix choir-app-backend run check

    # Install backend dependencies and restart process manager
    LOG_FILE="choir-app-backend/logs/exceptions.log"

    echo "Installing backend dependencies..."
    if ! npm --prefix choir-app-backend install; then
        echo "npm install failed!"
        exit 1
    fi

    echo "Archiving old logs..."
    npm --prefix choir-app-backend run archive-logs

    echo "Restarting backend..."
    pm2 restart chorleiter-api || true

    echo "Waiting 10 seconds for backend to start..."
    sleep 10

    echo "Checking PM2 status..."
    if ! pm2 describe chorleiter-api | grep -qi 'status.*online' >/dev/null 2>&1; then
        echo "Backend process failed to start. Recent log output:"
        echo "=== PM2 Logs ==="
        pm2 logs chorleiter-api --lines 30 --nostream 2>/dev/null || echo "No PM2 logs available"
        echo "=== Exception Log ==="
        tail -n 20 "$LOG_FILE" 2>/dev/null || echo "No exceptions log found"
        exit 1
    fi

    echo "Checking HTTP endpoint..."
    if ! curl -f -s http://localhost:8088/api/health >/dev/null 2>&1; then
        echo "Backend is running but not responding to HTTP requests!"
        echo ""
        echo "=== Checking .env Configuration ==="
        if [ -f "choir-app-backend/.env" ]; then
            echo "ADDRESS=$(grep '^ADDRESS=' choir-app-backend/.env 2>/dev/null || echo 'NOT SET')"
            echo "PORT=$(grep '^PORT=' choir-app-backend/.env 2>/dev/null || echo 'NOT SET')"
            echo "DB_DIALECT=$(grep '^DB_DIALECT=' choir-app-backend/.env 2>/dev/null || echo 'NOT SET')"
            echo ""
            ADDRESS_VALUE=$(grep '^ADDRESS=' choir-app-backend/.env | cut -d'=' -f2)
            if [ "$ADDRESS_VALUE" = "localhost" ]; then
                echo "WARNING: ADDRESS is set to 'localhost' - server may not be accessible from outside!"
                echo "Consider changing to ADDRESS=0.0.0.0 in choir-app-backend/.env"
            fi
        else
            echo ".env file not found!"
        fi
        echo ""
        echo "=== PM2 Logs ==="
        pm2 logs chorleiter-api --lines 30 --nostream 2>/dev/null || echo "No PM2 logs available"
        echo "=== Exception Log ==="
        tail -n 20 "$LOG_FILE" 2>/dev/null || echo "No exceptions log found"
        exit 1
    fi
fi

echo "Deployment completed."
printf "[%s] Deployment finished\n" "$(date '+%Y-%m-%d %H:%M:%S')"
