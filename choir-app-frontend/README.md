# ChoirAppFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.2.

## Development server

To start a local development server with timestamped output, run:

```bash
npm start
```

This command runs `ng serve` and prefixes build output with the current time.

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Navigation state handling

The frontend uses the browser History API together with `sessionStorage` to
remember pagination and the currently selected entry when navigating from a
list to a detail view. The helper `NavigationStateService` wraps the most
important calls:

- `history.replaceState` is used to attach the current page and selection to
  the list route before leaving it.
- `history.pushState` adds a placeholder entry so the browser's Back button
  returns to the list with the stored state.
- The `popstate` event is exposed via the service and can be consumed by any
  component that needs to react to history navigation immediately.

To integrate the same behaviour elsewhere, inject the service into a list
component, call `saveState` before navigating to a detail page and restore the
state with `getState` when the component is created. This pattern scales to
larger projects because each view can manage its own key and the underlying
implementation centralises History API usage.
