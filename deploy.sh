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

# Get password from file or prompt
if [[ -f "$PASSWORD_FILE" ]]; then
    PASSWORD=$(<"$PASSWORD_FILE")
fi

if [[ -z "$PASSWORD" ]]; then
    read -s -p "SSH password for ${REMOTE}: " PASSWORD
    echo
fi

SSH_CMD="ssh"
RSYNC_CMD="rsync -avz"
if command -v sshpass >/dev/null; then
    SSH_CMD="sshpass -p \"$PASSWORD\" ssh -o StrictHostKeyChecking=no"
    RSYNC_CMD="sshpass -p \"$PASSWORD\" rsync -avz"
fi

# Create remote directories
$SSH_CMD $REMOTE "mkdir -p \"$BACKEND_DEST\" \"$FRONTEND_DEST\""

# Deploy backend (excluding .env)
$RSYNC_CMD --delete --exclude='.env' choir-app-backend/ ${REMOTE}:"$BACKEND_DEST/"

# Deploy compiled frontend
$RSYNC_CMD --delete choir-app-frontend/dist/choir-app-frontend/browser/ ${REMOTE}:"$FRONTEND_DEST/"

echo "Deployment completed."
