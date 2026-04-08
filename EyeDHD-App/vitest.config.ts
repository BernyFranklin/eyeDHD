import { defineConfig } from 'vitest/config';
import { alias } from './vite.aliases';
import path from 'path';

export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: './src/tests/setup.ts'
	},
	resolve: {
		alias
	}
});