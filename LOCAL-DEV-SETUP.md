# Local Development Setup Guide

This guide helps you set up a local development environment with a copy of the production database.

## Prerequisites

Install on your Windows machine:

1. **PostgreSQL 15+**
   - Download: https://www.postgresql.org/download/windows/
   - During installation: Remember the password you set for `postgres` user
   - Default port: 5432

2. **Node.js 20+**
   - Already have it (Angular/Chorleiter development)

3. **Git** (optional, for version control)

## Step 1: Get Production Database Backup

### Option A: Download from Server via SSH

Run this PowerShell script (replace server details):

```powershell
# Connect to server and download latest backup
$server = "your-server.de"
$user = "your-ssh-user"
$remotePath = "/path/to/backups"
$localPath = "D:\Angular\Chorleiter\backups"

# Create backups folder if doesn't exist
New-Item -ItemType Directory -Path $localPath -Force

# Download latest backup using scp (requires SSH installed)
scp "$user@$server`:$remotePath/backup-*.sql" $localPath\
```

### Option B: Manual Download

1. SSH into your production server
2. Find the latest backup: `ls -lt /backups/` (or wherever backups are stored)
3. Download it to your local `backups/` folder

You should now have a file like: `backups/backup-2026-02-14T06-49-58-866Z.sql`

## Step 2: Create Local Development Database

Open **pgAdmin** (comes with PostgreSQL) or use command line:

### Via pgAdmin (GUI)
1. Right-click **Databases** → **Create** → **Database**
2. Name: `chorleiter_dev`
3. Click **Save**

### Via Command Line
```powershell
# Open PowerShell and connect to PostgreSQL
$env:PGPASSWORD = "your-postgres-password"
psql -U postgres -h localhost

# Then run:
CREATE DATABASE chorleiter_dev;
```

## Step 3: Restore Backup

```powershell
# In PowerShell (from project root or choir-app-backend folder)
$env:PGPASSWORD = "your-postgres-password"
$backupFile = ".\backups\backup-2026-02-14T06-49-58-866Z.sql"

# Restore the database
psql -U postgres -h localhost -d chorleiter_dev -f $backupFile

# Verify success - you should see "Done." at the end
```

## Step 4: Configure Local .env

Edit `choir-app-backend\.env`:

```env
ADDRESS=localhost
PORT=8088
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your-postgres-password
DB_NAME=chorleiter_dev
DB_DIALECT=postgresql

JWT_SECRET=your-test-secret-key-at-least-32-chars
ENCRYPTION_KEY=5deb5961088073f849477f2b6a8168787d955ddc43b231650475b7b492cc344a

CORS_ORIGINS=http://localhost:4200

DEBUG_AUTH=false
DEBUG_CSRF=false

SMTP_HOST=localhost
SMTP_PORT=25
SMTP_USER=no-reply
SMTP_PASS=
EMAIL_FROM=test@localhost
SMTP_STARTTLS=false
```

## Step 5: Start Backend

```powershell
cd choir-app-backend
npm install  # If you haven't recently
npm run dev
```

You should see:
```
✓ Server running on port 8088
✓ Database: chorleiter_dev (postgresql)
```

## Step 6: Build & Run Frontend (New Terminal)

```powershell
cd choir-app-frontend
npm install  # If you haven't recently
npm run startwithtimestamp
```

Browser opens to `http://localhost:4200`

## Step 7: Test Login

1. Backend initializes with seeded demo data (if table is empty)
2. Default admin account: Check `choir-app-backend/src/seed.js`
3. Or use existing production users in the restored database

---

## Troubleshooting

### "Connection refused" at port 8088
- PostgreSQL not running? Start PostgreSQL service
- Backend not started? Run `npm run dev`

### "Database does not exist"
- Did you create `chorleiter_dev`? Run Step 2 again
- Did you restore backup? Run Step 3 again

### "FATAL: role 'postgres' does not exist"
- PostgreSQL not installed or `postgres` user not created
- Reinstall PostgreSQL

### Frontend shows API errors
- Check backend logs in terminal
- Verify `DB_HOST`, `DB_USER`, DB_PASSWORD` in `.env`
- Verify `CORS_ORIGINS` includes `http://localhost:4200`

---

## Update Database When Production Changes

1. Take new backup on server: `npm run backup --prefix choir-app-backend`
2. Download to local `backups/` folder
3. Drop and recreate local database (Step 2)
4. Restore new backup (Step 3)

Or use the automated script: [setup-local-dev.ps1](./setup-local-dev.ps1)
