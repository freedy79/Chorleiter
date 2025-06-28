# Chorleiter

Management of choirs for directors

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
