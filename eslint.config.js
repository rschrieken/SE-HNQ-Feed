const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");
const globals = require("globals");

module.exports = (function() { return defineConfig([
	{
        files:["**/*.js"],
        ignores: ["dist/**"],
		plugins: {
			js,
		},
		extends: ["js/recommended"],
		rules: {
			semi: "error",
			"prefer-const": "error",
		},
        languageOptions: {
			ecmaVersion: 'latest',
			sourceType: "commonjs",
            globals: {
				...globals.browser,
                ...globals.node,
                ...globals.mocha
			},
		},
	},
]);}
)();