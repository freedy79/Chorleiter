module.exports = {
  root: true,
  ignorePatterns: ["**/node_modules/**"],
  overrides: [
    {
      files: ["choir-app-frontend/src/**/*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: ["./choir-app-frontend/tsconfig.app.json"],
        tsconfigRootDir: __dirname,
        sourceType: "module"
      },
      plugins: ["@typescript-eslint", "@angular-eslint"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@angular-eslint/recommended"
      ]
    },
    {
      files: ["choir-app-frontend/src/**/*.html"],
      parser: "@angular-eslint/template-parser",
      plugins: ["@angular-eslint/template"],
      extends: ["plugin:@angular-eslint/template/recommended"]
    },
    {
      files: ["choir-app-backend/**/*.js"],
      env: {
        node: true,
        es2021: true
      },
      extends: ["eslint:recommended"]
    }
  ]
};
