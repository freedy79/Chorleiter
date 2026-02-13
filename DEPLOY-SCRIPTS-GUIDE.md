# Deploy Scripts - Usage Guide

## Overview

The deployment scripts support selective building and uploading to optimize deployment time. By default, all steps are executed.

## Command Line Options

### deploy.ps1 (Windows/PowerShell)

```powershell
./deploy.ps1 [-Frontend] [-Backend] [-Upload] [-Verbose]
```

**Options:**
- `-Frontend` - Only build the Angular frontend
- `-Backend` - Only check and prepare the backend (no upload)
- `-Upload` - Only upload and deploy to the server (requires existing builds)
- `-Verbose` - Enable verbose logging

**Default (no flags):** Build frontend, check backend, and upload to server

**Examples:**
```powershell
# Build only backend (faster for backend changes)
./deploy.ps1 -Backend

# Build frontend and backend, but don't upload
./deploy.ps1 -Frontend -Backend

# Upload last build to server only
./deploy.ps1 -Upload

# Build everything with verbose output
./deploy.ps1 -Frontend -Backend -Upload -Verbose

# Default: build frontend, check backend, upload everything
./deploy.ps1
```

### deploy.sh (Linux/Mac)

```bash
./deploy.sh [-frontend] [-backend] [-upload]
```

**Options:**
- `-frontend` - Only build the Angular frontend
- `-backend` - Only check the backend
- `-upload` - Only upload and deploy to the server (requires existing builds)

**Default (no flags):** Build frontend, check backend, and upload to server

**Examples:**
```bash
# Build only backend (faster for backend changes)
./deploy.sh -backend

# Build frontend and backend, but don't upload
./deploy.sh -frontend -backend

# Upload last build to server only
./deploy.sh -upload

# Build everything
./deploy.sh

# Combine multiple options
./deploy.sh -frontend -backend -upload
```

### deploy-server.sh (Local Development)

```bash
./deploy-server.sh [-frontend] [-backend]
```

**Options:**
- `-frontend` - Only build the Angular frontend
- `-backend` - Only check and restart the backend

**Default (no flags):** Build frontend and restart backend

**Examples:**
```bash
# Build only frontend
./deploy-server.sh -frontend

# Only restart backend without rebuild
./deploy-server.sh -backend

# Build and restart everything
./deploy-server.sh
```

## Use Cases

### 1. Backend-Only Deployment (Fastest)
When you've only changed backend code:

```bash
# Windows
./deploy.ps1 -Backend -Upload

# Linux/Mac
./deploy.sh -backend -upload
```

This skips the frontend build (which typically takes 30-60 seconds).

### 2. Frontend-Only Deployment
When you've only changed frontend code:

```bash
# Windows
./deploy.ps1 -Frontend -Upload

# Linux/Mac
./deploy.sh -frontend -upload
```

### 3. Local Testing
For local development without uploading:

```bash
# Linux/Mac
./deploy-server.sh -backend
```

### 4. Testing Last Upload
If you've already created builds and want to re-upload:

```bash
# Windows
./deploy.ps1 -Upload

# Linux/Mac
./deploy.sh -upload
```

## Implementation Details

- **Build Caching:** Builds are created in place. When using `-upload` alone, it reuses the last build.
- **Git Operations:** Git status checks only occur when building (not when uploading only).
- **SSH Setup:** SSH connection setup only happens when uploading.
- **Log Archival:** Logs are archived on the server during every deployment (if backend is restarted).
- **Health Checks:** HTTP health checks happen after server restart (if backend is restarted).

## Error Handling

All scripts provide detailed error messages with:
- PM2 process status
- Recent log files (last 30 lines)
- Exception logs
- Configuration warnings (e.g., ADDRESS=localhost)
