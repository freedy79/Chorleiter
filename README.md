# Chorleiter

Management of choirs for directors

## Setup

Before starting the backend, install its dependencies:

```bash
npm install --prefix choir-app-backend
```

## Tests

Run frontend unit tests with:

```bash
npm test
```

This command uses the Angular CLI to execute Karma tests from the `choir-app-frontend` project.

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

## Deployment

Use `deploy.sh` on Unix systems or `deploy.ps1` on Windows to upload the backend
and frontend via SSH. Both scripts establish a persistent SSH connection.
When [`sshpass`](https://www.gnu.org/software/sshpass/) is available, the
password can be read from a file named `.chorleiter_deploy_pw` in your home
directory to perform a fully non‑interactive deployment. Without `sshpass`, the
password still needs to be entered once when the connection is initiated.
On Windows you can install `sshpass` with Chocolatey (`choco install sshpass`) or another package manager so that the deployment script can use it automatically. Alternatively, set up key-based authentication and load your private key into an SSH agent (for example with `Start-Service ssh-agent` followed by `ssh-add`). When `ssh` can authenticate using the agent, the deployment runs non‑interactively even without `sshpass`.
The PowerShell script automatically uses an available ssh-agent when `sshpass` is not installed.
