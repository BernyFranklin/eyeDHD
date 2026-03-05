/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const path = require('path');

module.exports = {
	env: {
		browser: true,
		es6: true,
		node: true
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:import/recommended',
		'plugin:import/electron',
		'plugin:import/typescript'
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: path.resolve(__dirname, 'tsconfig.json'),
		tsconfigRootDir: __dirname,
		sourceType: 'module'
	},
	settings: {
		'import/resolver': {
			typescript: {
				project: [path.resolve(__dirname, 'tsconfig.json')],
				alwaysTryTypes: true
			}
		}
	},
	rules: {
		'no-empty-pattern': 'off',
		'no-async-promise-executor': 'off',
		'@typescript-eslint/no-explicit-any': 'warn',
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'off',
			{
				args: 'none'
			}
		],
		'@typescript-eslint/no-empty-function': 'off',
		'no-empty-function': 'off',
		'no-mixed-spaces-and-tabs': 'off',
		'@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
		'no-unsafe-optional-chaining': 'warn'
	}
};