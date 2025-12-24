import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
	js.configs.recommended,
	{
		files: ["src/**/*.ts", "tests/**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: "module",
			},
			globals: {
				console: "readonly",
				process: "readonly",
				Buffer: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				module: "readonly",
				require: "readonly",
				exports: "readonly",
				global: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			"no-unused-vars": "off", // Turn off base rule
			"@typescript-eslint/no-unused-vars": "error",
			"@typescript-eslint/explicit-function-return-type": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"prefer-const": "error",
			"no-var": "error",
			"no-undef": "off", // TypeScript handles this
		},
	},
	{
		files: ["tests/**/*.ts"],
		languageOptions: {
			globals: {
				jest: "readonly",
				describe: "readonly",
				it: "readonly",
				expect: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
				beforeAll: "readonly",
				afterAll: "readonly",
			},
		},
	},
	{
		ignores: ["dist/", "node_modules/", "*.js", "coverage/"],
	},
];
