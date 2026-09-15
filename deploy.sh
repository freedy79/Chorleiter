#!/bin/bash
set -e

# Parse command line options
BUILD_FRONTEND=false
BUILD_BACKEND=false
UPLOAD_ONLY=false
VERBOSE=false

# If no arguments provided, default to all
if [ $# -eq 0 ]; then
    BUILD_FRONTEND=true
    BUILD_BACKEND=true
    UPLOAD_ONLY=true
else
    # Parse provided arguments
    for arg in "$@"; do
        case "$arg" in
            -frontend) BUILD_FRONTEND=true ;;
            -backend) BUILD_BACKEND=true ;;
            -upload) UPLOAD_ONLY=true ;;
            -verbose|-v) VERBOSE=true ;;
            *) echo "Unknown option: $arg" >&2; exit 1 ;;
        esac
    done
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load local deploy config if present
if [ -f "$SCRIPT_DIR/deploy.local.sh" ]; then
    source "$SCRIPT_DIR/deploy.local.sh"
elif [ "$UPLOAD_ONLY" = true ] && [ -f "$SCRIPT_DIR/deploy.local.example.sh" ]; then
    echo "Hint: create deploy.local.sh from deploy.local.example.sh to configure deployment options."
fi

REMOTE_USER="${CHORLEITER_DEPLOY_USER:-root}"
REMOTE_HOST="${CHORLEITER_DEPLOY_HOST:-88.222.220.28}"
BACKEND_DEST="${CHORLEITER_BACKEND_DEST:-/usr/local/lsws/ChorStatistik/backend}"
FRONTEND_DEST="${CHORLEITER_FRONTEND_DEST:-/usr/local/lsws/ChorStatistik/html}"
PM2_APP="${CHORLEITER_PM2_APP:-chorleiter-api}"
BACKEND_PORT="${CHORLEITER_BACKEND_PORT:-8088}"
PASSWORD_FILE="${HOME}/.chorleiter_deploy_pw"
REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

# Ensure temporary archives are cleaned up on exit
BACKEND_ARCHIVE=""
FRONTEND_ARCHIVE=""
cleanup() {
    [ -n "$BACKEND_ARCHIVE" ] && [ -f "$BACKEND_ARCHIVE" ] && rm -f "$BACKEND_ARCHIVE"
    [ -n "$FRONTEND_ARCHIVE" ] && [ -f "$FRONTEND_ARCHIVE" ] && rm -f "$FRONTEND_ARCHIVE"
}
trap cleanup EXIT

echo "[$(date '+%H:%M:%S')] Deploy options: Frontend=$BUILD_FRONTEND Backend=$BUILD_BACKEND Upload=$UPLOAD_ONLY"

if [ "$BUILD_FRONTEND" = true ] || [ "$BUILD_BACKEND" = true ]; then
    # Ensure remote repository is up to date
    echo "Checking git status..."
    git fetch >/dev/null 2>&1 || true
    STATUS=$(git status -uno)

    # Only ask to pull if remote is ahead, ignore local changes
    if [[ "$STATUS" == *"behind"* ]]; then
        read -r -p "Remote repository is ahead. Pull latest changes before deploying? (y/N) " update_repo
        if [[ $update_repo =~ ^[Yy]$ ]]; then
            git pull --rebase
        else
            echo "Continuing with current repository state."
        fi
    else
        echo "Local repository is up to date with remote."
    fi
fi

if [ "$BUILD_FRONTEND" = true ]; then
    SKIP_BUILD=false
    DIST_PATH="choir-app-frontend/dist/choir-app-frontend/browser"
    BUILD_INFO_PATH="choir-app-frontend/src/environments/build-info.ts"

    if [ -d "$DIST_PATH" ] && [ -f "$BUILD_INFO_PATH" ]; then
        CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || true)
        FRONTEND_CHANGES=$(git status --porcelain -- choir-app-frontend/src/ 2>/dev/null || true)

        if [ -n "$CURRENT_COMMIT" ] && [ -z "$FRONTEND_CHANGES" ]; then
            if grep -q "commit:.*'$CURRENT_COMMIT'" "$BUILD_INFO_PATH" 2>/dev/null || grep -q 'commit:.*"'$CURRENT_COMMIT'"' "$BUILD_INFO_PATH" 2>/dev/null; then
                echo "Frontend build is already up-to-date (commit: $CURRENT_COMMIT). Skipping build."
                SKIP_BUILD=true
            fi
        fi
    fi

    if [ "$SKIP_BUILD" = false ]; then
        echo "Building Angular frontend..."
        if ! npm --prefix choir-app-frontend run build; then
            echo "Build failed. Aborting deployment." >&2
            exit 1
        fi
        echo "Build finished."
    fi
fi

if [ "$BUILD_BACKEND" = true ]; then
    echo "Checking backend..."
    npm --prefix choir-app-backend run check
fi

if [ "$UPLOAD_ONLY" = true ]; then
    CONTROL_PATH="${HOME}/.chorleiter_ssh_control"
    SSH_OPTIONS="-o ControlMaster=auto -o ControlPath=${CONTROL_PATH} -o ControlPersist=10m -o StrictHostKeyChecking=accept-new"

    USE_PASSWORD=false
    PASSWORD=""

    # Test if non-interactive SSH key / agent authentication works
    if ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$REMOTE" "true" >/dev/null 2>&1; then
        echo "Using SSH key / agent authentication."
    else
        USE_PASSWORD=true
        if ! command -v sshpass >/dev/null 2>&1; then
            read -r -p "sshpass is not installed and passwordless SSH failed. Install sshpass now? (y/N) " install_sshpass
            if [[ $install_sshpass =~ ^[Yy]$ ]]; then
                sudo apt-get install -y sshpass
            else
                echo "Hint: install sshpass with: sudo apt-get install sshpass"
            fi
        fi

        if [ -f "$PASSWORD_FILE" ]; then
            PASSWORD=$(tr -d '\r\n' < "$PASSWORD_FILE")
            echo "Using password from $PASSWORD_FILE."
        else
            read -r -p "Password file $PASSWORD_FILE not found. Create it? (y/N) " create
            if [[ $create =~ ^[Yy]$ ]]; then
                read -s -p "SSH password for ${REMOTE}: " PASSWORD
                echo
                echo "$PASSWORD" > "$PASSWORD_FILE"
                chmod 600 "$PASSWORD_FILE" 2>/dev/null || true
            fi
        fi

        if [ -z "$PASSWORD" ]; then
            read -s -p "SSH password for ${REMOTE}: " PASSWORD
            echo
        fi
    fi

    ssh_cmd() {
        if [ "$USE_PASSWORD" = true ]; then
            sshpass -p "$PASSWORD" ssh $SSH_OPTIONS "$@"
        else
            ssh $SSH_OPTIONS "$@"
        fi
    }

    scp_cmd() {
        if [ "$USE_PASSWORD" = true ]; then
            sshpass -p "$PASSWORD" scp $SSH_OPTIONS "$@"
        else
            scp $SSH_OPTIONS "$@"
        fi
    }

    echo "Establishing SSH connection..."
    ssh_cmd "$REMOTE" "true"

    # Create temporary archives
    BACKEND_ARCHIVE=$(mktemp /tmp/backend_XXXXXX.tar.gz)
    FRONTEND_ARCHIVE=$(mktemp /tmp/frontend_XXXXXX.tar.gz)

    echo "Compressing backend (excluding node_modules, logs, uploads)..."
    tar --exclude=".env" --exclude="node_modules" --exclude="logs" --exclude="uploads" -czf "$BACKEND_ARCHIVE" -C "choir-app-backend" .

    echo "Compressing frontend..."
    tar -czf "$FRONTEND_ARCHIVE" -C "choir-app-frontend/dist/choir-app-frontend/browser" .

    echo "Creating remote directories..."
    ssh_cmd "$REMOTE" "mkdir -p \"$BACKEND_DEST\" \"$FRONTEND_DEST\""

    echo "Removing old frontend files..."
    ssh_cmd "$REMOTE" "rm -rf \"$FRONTEND_DEST\"/*"

    echo "Uploading backend archive..."
    scp_cmd "$BACKEND_ARCHIVE" "${REMOTE}:/tmp/backend.tar.gz"

    echo "Uploading frontend archive..."
    scp_cmd "$FRONTEND_ARCHIVE" "${REMOTE}:/tmp/frontend.tar.gz"

    echo "Extracting backend on server..."
    ssh_cmd "$REMOTE" "tar -xzf /tmp/backend.tar.gz -C \"$BACKEND_DEST\"; rm -f /tmp/backend.tar.gz"

    echo "Extracting frontend on server..."
    ssh_cmd "$REMOTE" "tar -xzf /tmp/frontend.tar.gz -C \"$FRONTEND_DEST\"; rm -f /tmp/frontend.tar.gz"

    echo "Creating database backup on server..."
    ssh_cmd "$REMOTE" "cd \"$BACKEND_DEST\" && npm run backup"

    echo "Installing backend dependencies..."
    if ! ssh_cmd "$REMOTE" "cd \"$BACKEND_DEST\" && npm install"; then
        echo "npm install failed on server!" >&2
        exit 1
    fi

    echo "Archiving old logs..."
    ssh_cmd "$REMOTE" "cd \"$BACKEND_DEST\" && npm run archive-logs"

    echo "Restarting backend service..."
    ssh_cmd "$REMOTE" "pm2 restart \"$PM2_APP\""

    echo "Waiting 10 seconds for backend to start..."
    sleep 10

    echo "Checking PM2 status..."
    if ! ssh_cmd "$REMOTE" "pm2 describe \"$PM2_APP\" | grep -qi 'status.*online'" >/dev/null 2>&1; then
        echo "Backend process failed to start. Recent log output:" >&2
        echo "=== PM2 Logs ===" >&2
        ssh_cmd "$REMOTE" "pm2 logs \"$PM2_APP\" --lines 30 --nostream 2>/dev/null || echo 'No PM2 logs available'"
        echo "=== Exception Log ===" >&2
        ssh_cmd "$REMOTE" "tail -n 20 \"$BACKEND_DEST/logs/exceptions.log\" 2>/dev/null || echo 'No exceptions log found'"
        exit 1
    fi

    echo "Checking HTTP endpoint..."
    # The backend runs all migrations/seeds before it starts listening, so poll instead of checking once.
    http_ready=0
    max_wait=180
    elapsed=0
    while [ "$elapsed" -lt "$max_wait" ]; do
        if ssh_cmd "$REMOTE" "curl -f -s http://localhost:${BACKEND_PORT}/api/health >/dev/null 2>&1"; then
            http_ready=1
            break
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo "  ...still waiting for backend startup (${elapsed}/${max_wait} s)"
    done
    if [ "$http_ready" -ne 1 ]; then
        echo "Backend is running but not responding to HTTP requests after ${max_wait} seconds!" >&2
        echo ""
        echo "=== Checking .env Configuration ==="
        ssh_cmd "$REMOTE" "cd \"$BACKEND_DEST\" && if [ -f .env ]; then echo 'ADDRESS='\$(grep '^ADDRESS=' .env 2>/dev/null || echo 'NOT SET'); echo 'PORT='\$(grep '^PORT=' .env 2>/dev/null || echo 'NOT SET'); echo 'DB_DIALECT='\$(grep '^DB_DIALECT=' .env 2>/dev/null || echo 'NOT SET'); echo ''; ADDRESS_VALUE=\$(grep '^ADDRESS=' .env | cut -d'=' -f2); if [ \"\$ADDRESS_VALUE\" = 'localhost' ]; then echo 'WARNING: ADDRESS is set to localhost - server may not be accessible from outside!'; echo 'Consider changing to ADDRESS=0.0.0.0 in $BACKEND_DEST/.env'; fi; else echo '.env file not found!'; fi"
        echo ""
        echo "=== PM2 Logs ==="
        ssh_cmd "$REMOTE" "pm2 logs \"$PM2_APP\" --lines 30 --nostream 2>/dev/null || echo 'No PM2 logs available'"
        echo "=== Exception Log ==="
        ssh_cmd "$REMOTE" "tail -n 20 \"$BACKEND_DEST/logs/exceptions.log\" 2>/dev/null || echo 'No exceptions log found'"
        exit 1
    fi

    echo "Deployment completed."

    # Close the persistent SSH connection
    if [ "$USE_PASSWORD" = true ]; then
        sshpass -p "$PASSWORD" ssh $SSH_OPTIONS -O exit "$REMOTE" >/dev/null 2>&1 || true
    else
        ssh $SSH_OPTIONS -O exit "$REMOTE" >/dev/null 2>&1 || true
    fi
else
    echo "Build completed. Skipped deployment (use -upload flag to deploy to server)."
fi

printf "[%s] Successfully deployed\n" "$(date '+%H:%M:%S')"
