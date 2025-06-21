import { defineConfig } from "eslint/config";

export default defineConfig([
	{
		rules: {
			semi: "error",
			"prefer-const": "error",
		},
        languageOptions: {
			ecmaVersion: 'latest',
			sourceType: "commonjs",
		},
	},
]);