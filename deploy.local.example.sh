# deploy.local.example.sh
#
# Copy this file to deploy.local.sh and fill in your values.
# deploy.local.sh is gitignored and will NEVER be committed.
#
# Usage:
#   cp deploy.local.example.sh deploy.local.sh
#   # Edit deploy.local.sh with your actual values
#   ./deploy.sh

# --- Required (defaults shown) ---
# CHORLEITER_DEPLOY_USER="root"
# CHORLEITER_DEPLOY_HOST="88.222.220.28"
# CHORLEITER_BACKEND_DEST="/usr/local/lsws/ChorStatistik/backend"
# CHORLEITER_FRONTEND_DEST="/usr/local/lsws/ChorStatistik/html"

# --- Optional (defaults shown) ---
# CHORLEITER_PM2_APP="chorleiter-api"
# CHORLEITER_BACKEND_PORT="8088"
