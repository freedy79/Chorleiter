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

SSH_CMD="ssh"
SCP_CMD="scp"
if command -v sshpass >/dev/null; then
    SSH_CMD="sshpass -p \"$PASSWORD\" ssh -o StrictHostKeyChecking=no"
    SCP_CMD="sshpass -p \"$PASSWORD\" scp"
fi

# Create temporary archives
BACKEND_ARCHIVE=$(mktemp --suffix=.tar.gz)
FRONTEND_ARCHIVE=$(mktemp --suffix=.tar.gz)

# Pack directories
tar --exclude=".env" -czf "$BACKEND_ARCHIVE" -C "choir-app-backend" .
tar -czf "$FRONTEND_ARCHIVE" -C "choir-app-frontend/dist/choir-app-frontend/browser" .

# Create remote directories
$SSH_CMD $REMOTE "mkdir -p \"$BACKEND_DEST\" \"$FRONTEND_DEST\""

# Upload archives
$SCP_CMD "$BACKEND_ARCHIVE" ${REMOTE}:/tmp/backend.tar.gz
$SCP_CMD "$FRONTEND_ARCHIVE" ${REMOTE}:/tmp/frontend.tar.gz

# Extract archives on server and clean up
$SSH_CMD $REMOTE "tar -xzf /tmp/backend.tar.gz -C \"$BACKEND_DEST\"; rm /tmp/backend.tar.gz"
$SSH_CMD $REMOTE "tar -xzf /tmp/frontend.tar.gz -C \"$FRONTEND_DEST\"; rm /tmp/frontend.tar.gz"

# Restart backend
$SSH_CMD $REMOTE "pm2 restart chorleiter-api"

# Remove local archives
rm -f "$BACKEND_ARCHIVE" "$FRONTEND_ARCHIVE"

echo "Deployment completed."
