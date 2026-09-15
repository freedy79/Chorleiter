# deploy.local.example.ps1
#
# Copy this file to deploy.local.ps1 and fill in your values.
# deploy.local.ps1 is gitignored and will NEVER be committed.
#
# Usage:
#   cp deploy.local.example.ps1 deploy.local.ps1
#   # Edit deploy.local.ps1 with your actual values
#   ./deploy.ps1

# --- Required ---
$env:CHORLEITER_DEPLOY_USER   = "your-deploy-user"     # Use a dedicated deploy user, not root
$env:CHORLEITER_DEPLOY_HOST   = "your.server.address"  # hostname or IP
$env:CHORLEITER_BACKEND_DEST  = "/path/to/backend"
$env:CHORLEITER_FRONTEND_DEST = "/path/to/html"

# --- Optional (defaults shown) ---
# $env:CHORLEITER_PM2_APP       = "chorleiter-api"
# $env:CHORLEITER_BACKEND_PORT  = "8088"

# --- SSH Authentication (choose one) ---
#
# Option A (recommended): SSH key file for plink
#   Generate a key pair with PuTTYgen, add the public key to ~/.ssh/authorized_keys
#   on the server, and set the path to the .ppk file here.
# $env:CHORLEITER_SSH_KEY_FILE  = "$env:USERPROFILE\.ssh\chorleiter_deploy_key.ppk"
#
# Option B: ssh-agent / Pageant
#   Load your key into ssh-agent or Pageant before running the script.
#   The script will detect it automatically.
#
# Option C (least secure): password file ~/.chorleiter_deploy_pw
#   If neither A nor B is configured, the script falls back to the password file.
#   The password is passed as a plink argument, which may appear in process listings.
#   Restrict the file to your user account and prefer SSH keys instead.
