# 🚀 Quick Start: Local Development (5 minutes)

## TL;DR - Fastest Path

### 1️⃣ Install PostgreSQL (If not done)
Download & install: https://www.postgresql.org/download/windows/
- **Remember the password you set for "postgres" user!**

### 2️⃣ Run Setup Script (Automated)

```powershell
# Open PowerShell in your project root folder
.\setup-local-dev.ps1
```

**It will:**
- ✓ Create local database `chorleiter_dev`
- ✓ Ask which backup to restore
- ✓ Configure `.env` file
- ✓ Install npm dependencies

### 3️⃣ Start Services (2 PowerShell windows)

**Window 1 - Backend:**
```powershell
cd choir-app-backend
npm run dev
```

**Window 2 - Frontend:**
```powershell
cd choir-app-frontend
npm run startwithtimestamp
```

Browser opens → http://localhost:4200

---

## If Setup Script Doesn't Work

### Manual Steps:

**1. Create database:**
```powershell
$env:PGPASSWORD = "your-postgres-password"
psql -U postgres -h localhost -c "CREATE DATABASE chorleiter_dev;"
```

**2. Restore backup:**
```powershell
psql -U postgres -h localhost -d chorleiter_dev -f ".\backups\backup-2026-02-14T06-49-58-866Z.sql"
```
(Replace filename with actual backup file)

**3. Update `.env` in `choir-app-backend\.env`:**
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your-postgres-password
DB_NAME=chorleiter_dev
DB_DIALECT=postgresql
CORS_ORIGINS=http://localhost:4200
```

**4. Start services (as above)**

---

## Common Issues

| Problem | Solution |
|---------|----------|
| "psql not found" | PostgreSQL not installed or not in PATH |
| "Connection refused" | PostgreSQL service not running, or wrong password |
| "Database does not exist" | Run CREATE DATABASE command above |
| "Frontend won't connect to API" | Check CORS_ORIGINS in .env includes `http://localhost:4200` |

---

## Update Your Database

When production data changes and you want fresh data locally:

```powershell
# 1. Get latest backup from server (manually or via scp)
# 2. Run setup script again:
.\setup-local-dev.ps1 -PostgresPassword "your-password"
```

---

## Full Documentation

See [LOCAL-DEV-SETUP.md](./LOCAL-DEV-SETUP.md) for complete guide with troubleshooting.
