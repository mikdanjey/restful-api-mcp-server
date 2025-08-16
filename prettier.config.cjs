/** @type {import("prettier").Config} */
module.exports = {
  endOfLine: "lf", // Consistent line endings (recommended)
  semi: true, // Enforces semicolons
  useTabs: false, // Uses spaces instead of tabs
  singleQuote: false, // Uses double quotes
  tabWidth: 2, // Two-space indentation
  printWidth: 200, // Very wide lines (for custom style)
  jsxSingleQuote: false, // Double quotes in JSX
  bracketSpacing: true, // { foo: bar } instead of {foo:bar}
  arrowParens: "avoid", // Omit parens when possible (x => x)
  requirePragma: false,
  insertPragma: false,
};
