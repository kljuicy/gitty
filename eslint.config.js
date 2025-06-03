import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/*.test.ts", "**/*.spec.ts"], // Handle test files separately
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        BufferEncoding: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" 
        },
      ],

      // More specific rule to prevent .js imports in TypeScript files
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["./*.js", "../*.js", "./**/*.js", "../**/*.js"],
              "message": "Don't import .js files in TypeScript. Remove the .js extension from relative imports."
            }
          ]
        }
      ],

      // General code quality
      "no-console": "off", // CLI tool needs console
      "no-unused-vars": "off", // Use TypeScript version instead
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // Test files - without TypeScript project reference
    files: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        BufferEncoding: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Relax rules for test files
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Also apply no .js imports rule to test files
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["./*.js", "../*.js", "./**/*.js", "../**/*.js"],
              "message": "Don't import .js files in TypeScript. Remove the .js extension from relative imports."
            }
          ]
        }
      ],

      "no-console": "off",
      "no-unused-vars": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    ignores: [
      "dist/",
      "node_modules/",
      "coverage/",
      "*.config.js",
      "*.config.ts",
    ],
  },
];
