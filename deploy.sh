#!/bin/bash
set -e

# Parse command line options
BUILD_FRONTEND=false
BUILD_BACKEND=false
UPLOAD_ONLY=false

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
            *) echo "Unknown option: $arg" >&2; exit 1 ;;
        esac
    done
fi

PASSWORD_FILE="${HOME}/.chorleiter_deploy_pw"
REMOTE_USER="root"
REMOTE_HOST="88.222.220.28"
REMOTE="${REMOTE_USER}@${REMOTE_HOST}"
BACKEND_DEST="/usr/local/lsws/ChorStatistik/backend"
FRONTEND_DEST="/usr/local/lsws/ChorStatistik/html"

echo "Deploy options: Frontend=$BUILD_FRONTEND Backend=$BUILD_BACKEND Upload=$UPLOAD_ONLY"

if [ "$BUILD_FRONTEND" = true ] || [ "$BUILD_BACKEND" = true ]; then

# Check for sshpass before proceeding
USE_SSHPASS=false
if command -v sshpass >/dev/null; then
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
    # Build Angular frontend
    echo "Building Angular frontend..."
    if ! npm --prefix choir-app-frontend run build; then
        echo "Build failed. Aborting deployment." >&2
        exit 1
    fi

    echo "Build finished."
fi

if [ "$BUILD_BACKEND" = true ]; then
    # Verify backend can start by syntax checking server.js
    npm --prefix choir-app-backend run check
fi

if [ "$UPLOAD_ONLY" = true ]; then

    # Check for sshpass before proceeding
    USE_SSHPASS=false
    if command -v sshpass >/dev/null; then
        USE_SSHPASS=true
    else
        read -r -p "sshpass is not installed. Install it now? (y/N) " install_sshpass
        if [[ $install_sshpass =~ ^[Yy]$ ]]; then
            sudo apt-get install sshpass && USE_SSHPASS=true
        fi
        if [[ $USE_SSHPASS == false ]]; then
            echo "Hint: install sshpass with: sudo apt-get install sshpass"
        fi
    fi

    # Get password from file or prompt
    if [[ -f "$PASSWORD_FILE" ]]; then
        # Remove trailing newlines to avoid authentication issues
        PASSWORD=$(tr -d '\r\n' < "$PASSWORD_FILE")
    else
        read -r -p "Password file $PASSWORD_FILE not found. Create it? (y/N) " create
        if [[ $create =~ ^[Yy] ]]; then
            read -s -p "SSH password for ${REMOTE}: " PASSWORD
            echo
            echo "$PASSWORD" > "$PASSWORD_FILE"
        fi
    fi

    if [[ -z "$PASSWORD" ]]; then
        read -s -p "SSH password for ${REMOTE}: " PASSWORD
        echo
    fi

    CONTROL_PATH="${HOME}/.chorleiter_ssh_control"
    SSH_OPTIONS="-o ControlMaster=auto -o ControlPath=${CONTROL_PATH} -o ControlPersist=10m -o StrictHostKeyChecking=no"

    ssh_cmd() {
        if [[ $USE_SSHPASS == true ]]; then
            sshpass -p "$PASSWORD" ssh -v $SSH_OPTIONS "$@"
        else
            ssh $SSH_OPTIONS "$@"
        fi
    }

    scp_cmd() {
        if [[ $USE_SSHPASS == true ]]; then
            sshpass -p "$PASSWORD" scp $SSH_OPTIONS "$@"
        else
            scp $SSH_OPTIONS "$@"
        fi
    }

    # Establish master connection so the password is only requested once
    echo "Establishing SSH connection..."
    ssh_cmd "$REMOTE" "true"

    # Create temporary archives
    BACKEND_ARCHIVE=$(mktemp --suffix=.tar.gz)
    FRONTEND_ARCHIVE=$(mktemp --suffix=.tar.gz)

    # Pack directories
    echo "Packing backend..."
tar --exclude=".env" -czf "$BACKEND_ARCHIVE" -C "choir-app-backend" .
echo "Packing frontend..."
tar -czf "$FRONTEND_ARCHIVE" -C "choir-app-frontend/dist/choir-app-frontend/browser" .

# Create remote directories
echo "Creating remote directories..."
ssh_cmd "$REMOTE" "mkdir -p \"$BACKEND_DEST\" \"$FRONTEND_DEST\""

# Remove existing frontend files before uploading new ones
echo "Removing old frontend files..."
ssh_cmd "$REMOTE" "rm -rf \"$FRONTEND_DEST\"/*"

# Upload archives
scp_cmd "$BACKEND_ARCHIVE" ${REMOTE}:/tmp/backend.tar.gz
scp_cmd "$FRONTEND_ARCHIVE" ${REMOTE}:/tmp/frontend.tar.gz

# Extract archives on server and clean up
ssh_cmd "$REMOTE" "tar -xzf /tmp/backend.tar.gz -C \"$BACKEND_DEST\"; rm /tmp/backend.tar.gz"
ssh_cmd "$REMOTE" "tar -xzf /tmp/frontend.tar.gz -C \"$FRONTEND_DEST\"; rm /tmp/frontend.tar.gz"

# Backup database on server
echo "Creating database backup on server..."
ssh_cmd "$REMOTE" "cd \"$BACKEND_DEST\" && npm run backup"

# Ensure backend dependencies are installed
echo "Installing backend dependencies..."
if ! ssh_cmd "$REMOTE" "cd \"$BACKEND_DEST\" && npm install"; then
    echo "npm install failed on server!"
    exit 1
fi

echo "Archiving old logs..."
ssh_cmd "$REMOTE" "cd \"$BACKEND_DEST\" && npm run archive-logs"

# Restart backend
echo "Restarting backend service..."
ssh_cmd "$REMOTE" "pm2 restart chorleiter-api"

echo "Waiting 10 seconds for backend to start..."
sleep 10

# Verify backend started
echo "Checking PM2 status..."
if ! ssh_cmd "$REMOTE" "pm2 describe chorleiter-api | grep -qi 'status.*online'" >/dev/null 2>&1; then
    echo "Backend process failed to start. Recent log output:"
    echo "=== PM2 Logs ==="
    ssh_cmd "$REMOTE" "pm2 logs chorleiter-api --lines 30 --nostream 2>/dev/null || echo 'No PM2 logs available'"
    echo "=== Exception Log ==="
    ssh_cmd "$REMOTE" "tail -n 20 '$BACKEND_DEST/logs/exceptions.log' 2>/dev/null || echo 'No exceptions log found'"
    # Remove local archives before exiting
    rm -f "$BACKEND_ARCHIVE" "$FRONTEND_ARCHIVE"
    exit 1
fi

echo "Checking HTTP endpoint..."
if ! ssh_cmd "$REMOTE" "curl -f -s http://localhost:8088/api/health >/dev/null 2>&1"; then
    echo "Backend is running but not responding to HTTP requests!"
    echo ""
    echo "=== Checking .env Configuration ==="
    ssh_cmd "$REMOTE" "cd \"$BACKEND_DEST\" && if [ -f .env ]; then
        echo 'ADDRESS='\$(grep '^ADDRESS=' .env 2>/dev/null || echo 'NOT SET');
        echo 'PORT='\$(grep '^PORT=' .env 2>/dev/null || echo 'NOT SET');
        echo 'DB_DIALECT='\$(grep '^DB_DIALECT=' .env 2>/dev/null || echo 'NOT SET');
        echo '';
        ADDRESS_VALUE=\$(grep '^ADDRESS=' .env | cut -d'=' -f2);
        if [ \"\$ADDRESS_VALUE\" = 'localhost' ]; then
            echo 'WARNING: ADDRESS is set to localhost - server may not be accessible from outside!';
            echo 'Consider changing to ADDRESS=0.0.0.0 in $BACKEND_DEST/.env';
        fi;
    else
        echo '.env file not found!';
    fi"
    echo ""
    echo "=== PM2 Logs ==="
    ssh_cmd "$REMOTE" "pm2 logs chorleiter-api --lines 30 --nostream 2>/dev/null || echo 'No PM2 logs available'"
    echo "=== Exception Log ==="
    ssh_cmd "$REMOTE" "tail -n 20 '$BACKEND_DEST/logs/exceptions.log' 2>/dev/null || echo 'No exceptions log found'"
    # Remove local archives before exiting
    rm -f "$BACKEND_ARCHIVE" "$FRONTEND_ARCHIVE"
    exit 1
fi

# Remove local archives
rm -f "$BACKEND_ARCHIVE" "$FRONTEND_ARCHIVE"

echo "Deployment completed."

# Close the persistent SSH connection
if [[ $USE_SSHPASS == true ]]; then
    sshpass -p "$PASSWORD" ssh $SSH_OPTIONS -O exit $REMOTE
else
    ssh $SSH_OPTIONS -O exit $REMOTE
fi

else
    echo "Build completed. Skipped deployment (use -upload flag to deploy to server)."
fi

printf "[%s] Successully deployed\n" "$(date '+%H:%M:%S')"
