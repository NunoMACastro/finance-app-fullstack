module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: "latest",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "react-hooks/exhaustive-deps": "off",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true }
    ]
  },
  overrides: [
    {
      files: [
        "src/app/components/ui/badge.tsx",
        "src/app/components/ui/button.tsx",
        "src/app/components/ui/form.tsx",
        "src/app/components/ui/navigation-menu.tsx",
        "src/app/components/ui/sidebar.tsx",
        "src/app/components/ui/toggle.tsx",
        "src/app/lib/account-context.tsx",
        "src/app/lib/auth-context.tsx",
        "src/app/lib/theme-preferences.tsx",
      ],
      rules: {
        "react-refresh/only-export-components": "off",
      },
    },
  ],
};
