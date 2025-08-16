module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended"],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["off", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    "no-console": "off", // Allow console for logging in this server
    "prefer-const": "off",
    "no-var": "off",
    "no-unused-vars": "off", // Turn off base rule as it can report incorrect errors
  },
  overrides: [
    {
      files: ["src/**/*.ts"],
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    {
      files: ["**/*.test.ts", "**/*.spec.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "no-console": "off",
      },
    },
  ],
  ignorePatterns: [".eslintrc.js", "jest.config.js", "dist/**/*", "coverage/**/*", "*.config.js"],
};
