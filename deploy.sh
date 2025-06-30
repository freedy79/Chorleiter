#!/bin/bash
set -e

PASSWORD_FILE="${HOME}/.chorleiter_deploy_pw"
REMOTE_USER="root"
REMOTE_HOST="88.222.220.28"
REMOTE="${REMOTE_USER}@${REMOTE_HOST}"
BACKEND_DEST="/usr/local/lsws/ChorStatistik/backend"
FRONTEND_DEST="/usr/local/lsws/ChorStatistik/html"

# Build Angular frontend
npm --prefix choir-app-frontend run build

echo "Build finished."

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
        sshpass -p "$PASSWORD" ssh $SSH_OPTIONS "$@"
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
echo "Establishing SSH connection... Password: $PASSWORD"
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

# Upload archives
scp_cmd "$BACKEND_ARCHIVE" ${REMOTE}:/tmp/backend.tar.gz
scp_cmd "$FRONTEND_ARCHIVE" ${REMOTE}:/tmp/frontend.tar.gz

# Extract archives on server and clean up
ssh_cmd "$REMOTE" "tar -xzf /tmp/backend.tar.gz -C \"$BACKEND_DEST\"; rm /tmp/backend.tar.gz"
ssh_cmd "$REMOTE" "tar -xzf /tmp/frontend.tar.gz -C \"$FRONTEND_DEST\"; rm /tmp/frontend.tar.gz"

# Restart backend
ssh_cmd "$REMOTE" "pm2 restart chorleiter-api"

# Remove local archives
rm -f "$BACKEND_ARCHIVE" "$FRONTEND_ARCHIVE"

echo "Deployment completed."

# Close the persistent SSH connection
if [[ $USE_SSHPASS == true ]]; then
    sshpass -p "$PASSWORD" ssh $SSH_OPTIONS -O exit $REMOTE
else
    ssh $SSH_OPTIONS -O exit $REMOTE
fi
