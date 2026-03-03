import { defineConfig } from 'vite';
import path from 'path';
import { alias } from './vite.aliases';

// https://vitejs.dev/config
export default defineConfig({
	resolve: {
		alias
	},
	build: {
		target: 'node16', // or the node/electron target you need
		// keep better-sqlite3 external: don't bundle native node module
		rollupOptions: {
			external: ['electron', 'better-sqlite3']
		},
		// Pass options through to @rollup/plugin-commonjs
		commonjsOptions: {
			dynamicRequireTargets: [
				path.resolve(__dirname, 'node_modules/better-sqlite3/build/**')
			]
		}
	}
});
