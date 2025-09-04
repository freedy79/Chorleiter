# Chorleiter

Management of choirs for directors

## Setup

Before starting the backend, install its dependencies:

```bash
npm install --prefix choir-app-backend
```

You can initialize the database separately using

```bash
npm run init --prefix choir-app-backend
```

Run only the seeding step with

```bash
npm run seed --prefix choir-app-backend
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
ADMIN_EMAIL=admin@example.com
```
The sender name is automatically set to the `EMAIL_FROM` address so that
`no-reply@nak-chorleiter.de` appears as the sender in mail clients.
Set `SMTP_STARTTLS` to `true` to enforce a STARTTLS handshake when connecting to the mail server.

If `ADMIN_EMAIL` is defined, the application sends a notification to that
address when the backend shuts down due to an unhandled error.

When the application is started for the first time these settings are written to
the database and can later be changed through the admin endpoint
`/admin/mail-settings`.
After saving new settings you can send yourself a test email from that page to verify the configuration.
Any errors during mail delivery are written to `logs/error.log` for troubleshooting.

### Rate Limiting

Configure the number of requests allowed per minute with the `RATE_LIMIT_MAX`
environment variable in `choir-app-backend/.env` or via the environment. The
default is 200 requests per minute:

```ini
RATE_LIMIT_MAX=200
```

### Mail Templates

Invitation, password reset, monthly plan and availability request mails are based on templates
stored in the database. Administrators can edit the subject and HTML body for
each type under the `/admin/mail-templates` page. The availability request
template is used when a plan administrator sends a "Verfügbarkeit anfragen"
email from the monthly plan view.  The following placeholders are available and
will be replaced automatically. Placeholders that are specific to one template
can also be prefixed with the template type, e.g. `{{invite-link}}` or
`{{availability-request-link}}`:

```
{{link}}
{{choir}}
{{invitor}}
{{expiry}}
{{month}}
{{year}}
{{list}}
{{surname}}
{{date}}
```

Each of the above placeholders can also appear with a prefix matching the
template type. For example `{{invite-link}}` will be replaced with the same
value as `{{link}}` when sending an invitation email.  Additionally any
placeholder ending in `link` supports a `-html` variant that inserts a clickable
anchor element. For instance `{{link-html}}` or `{{invite-link-html}}` expands to
`<a href="https://example.com">https://example.com</a>`.

After saving a template you can send yourself a preview email to verify the
formatting.

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
on `choir-app-backend/server.ts` using `node --check`. This catches backend
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

## Reusable CRUD controller

Standard CRUD operations are implemented once in `src/controllers/baseCrud.controller.js`.
Controllers instantiate this helper and either use the generic handlers directly
or call `base.service` for custom logic. Example:

```javascript
const BaseCrudController = require('./baseCrud.controller');
const base = new BaseCrudController(Category);

exports.findAll = async (req, res) => {
    const categories = await base.service.findAll({ order: [['name', 'ASC']] });
    res.status(200).send(categories);
};

exports.findById = base.findById;
exports.update = base.update;
exports.delete = base.delete;
```

`piece.controller.js` now delegates its basic operations to this controller so
that only the piece-specific logic remains.

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
