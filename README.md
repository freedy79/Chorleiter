# Chorleiter

Management of choirs for directors

## Setup

Before starting the backend, install its dependencies:

```bash
npm install --prefix choir-app-backend
```

### Mail Configuration

Configure the SMTP server used for password resets and invitations by adding the
following variables to `choir-app-backend/.env` (or set them as environment
variables):

```ini
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_USER=no-reply
SMTP_PASS=
EMAIL_FROM=no-reply@nak-chorleiter.de
SMTP_STARTTLS=false
```
The sender name is automatically set to the `EMAIL_FROM` address so that
`no-reply@nak-chorleiter.de` appears as the sender in mail clients.
Set `SMTP_STARTTLS` to `true` to enforce a STARTTLS handshake when connecting to the mail server.

When the application is started for the first time these settings are written to
the database and can later be changed through the admin endpoint
`/admin/mail-settings`.
After saving new settings you can send yourself a test email from that page to verify the configuration.
Any errors during mail delivery are written to `logs/error.log` for troubleshooting.

## Tests

Run frontend unit tests with:

```bash
npm test
```

This command uses the Angular CLI to execute Karma tests from the `choir-app-frontend` project.

The build information file `choir-app-frontend/src/environments/build-info.ts` is generated automatically when running the build, start or test scripts. This keeps the ever-changing commit hash and timestamp out of version control while still allowing the application and tests to access the data.

Run backend model tests with:

```bash
npm test --prefix choir-app-backend
```

These tests load all Sequelize models using an in-memory SQLite database and
verify required fields and associations.

## Demo Account

For demonstration you can log in with `demo@nak-chorleiter.de` using the password `demo`.
The account is locked to the "Demo-Chor" choir and resets its events on every login.
Data modifications like user or choir changes, piece or collection management are blocked.

## Compression

The backend enables gzip compression by including the
[`compression`](https://www.npmjs.com/package/compression) middleware. Running
`npm install` inside `choir-app-backend` installs this dependency automatically.

For the Angular frontend you can pre-compress build artifacts using
`compression-webpack-plugin` together with a custom webpack configuration:

```bash
npm install --save-dev compression-webpack-plugin @angular-builders/custom-webpack
```

The generated `.gz` or `.br` files can then be served by a web server that
supports content negotiation for pre-compressed assets.

Before packaging the files for upload, the deployment scripts run a syntax check
on `choir-app-backend/server.js` using `node --check`. This catches backend
syntax errors locally so you don't discover them only after uploading.

## Error Handling

Backend controllers do not contain repetitive `try`/`catch` blocks. Instead the
routes wrap each controller function with `src/utils/async.js` which is a thin
wrapper around `express-async-handler`. Any error thrown inside an async
controller is forwarded to the global error middleware in `src/app.js` where it
is logged and answered with status code 500.

Example usage in a route file:

```javascript
const { handler: wrap } = require('../utils/async');
router.get('/', wrap(controller.findAll));
```

Controllers can therefore simply `throw` or allow errors to bubble up without
manual error handling.

See `src/controllers/example.controller.js` for a minimal controller using this
approach.

## Deployment

Use `deploy.sh` on Unix systems or `deploy.ps1` on Windows to upload the backend
and frontend via SSH. Both scripts establish a persistent SSH connection when
using OpenSSH. If a `.chorleiter_deploy_pw` file exists in your home directory,
the password is read from there so that the deployment can run without manual
input. On Windows the script falls back to PuTTY's `plink`/`pscp` utilities when
they are available. Alternatively, set up key-based authentication and load your
private key into an SSH agent (for example with `Start-Service ssh-agent`
followed by `ssh-add`). When `ssh` or `plink` can authenticate using the agent,
the deployment runs non‑interactively. The PowerShell script automatically
detects an available ssh-agent or `plink` to avoid repeated password prompts.
The scripts will exit early if the backend syntax check fails.
