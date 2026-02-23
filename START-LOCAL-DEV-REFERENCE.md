# Start Local Development - Quick Reference

## One-Command Startup

```powershell
.\start-local-dev.ps1
```

That's it! This script:
- ✓ Checks PostgreSQL is running (starts it if needed)
- ✓ Verifies `.env` is configured
- ✓ Confirms database `chorleiter_dev` exists
- ✓ Checks npm dependencies installed
- ✓ **If anything is wrong**, automatically runs setup script
- ✓ Starts backend in one terminal (port 8088)
- ✓ Starts frontend in another terminal (port 4200)
- ✓ Opens browser to http://localhost:4200

## What Gets Checked

1. **PostgreSQL Service** - Must be running
2. **psql CLI** - Must be in PATH (or auto-found)
3. **.env Configuration** - Must have PostgreSQL connection settings
4. **Database** - `chorleiter_dev` must exist
5. **Dependencies** - `node_modules` in both backend and frontend

If **any check fails**, setup script runs automatically.

## First Time Setup

First time, just run:
```powershell
.\start-local-dev.ps1
```

It will:
1. Detect missing configuration
2. Run setup script automatically
3. Start services once ready

## Manual Setup (If Preferred)

```powershell
# Step 1: Setup (one time)
.\setup-local-dev.ps1

# Step 2: Start thereafter
.\start-local-dev.ps1
```

## Troubleshooting

**"PostgreSQL service not running"**
- Services should auto-start, but you can manually start:
  ```powershell
  Get-Service postgresql-x64-* | Start-Service
  ```

**"psql not found"**
- Add to PATH permanently (see [QUICK-START-LOCAL-DEV.md](QUICK-START-LOCAL-DEV.md))
- Or: `$env:PATH += "C:\Program Files\PostgreSQL\18\bin"`

**"Database not found"**
- Check PostgreSQL is running
- Check password is correct (default: `postgres`)
- Restore backup manually if needed

**"npm dependencies missing"**
- Script will run `npm install` automatically during setup

## Default Credentials

- **PostgreSQL User**: `postgres`
- **PostgreSQL Password**: `postgres`
- **Database**: `chorleiter_dev`
- **Backend Port**: `8088`
- **Frontend Port**: `4200`

## Stop Services

Press `Ctrl+C` in either terminal, or close the windows.

## Want to Use Different Password?

```powershell
.\start-local-dev.ps1 -PostgresPassword "your-password"
```
