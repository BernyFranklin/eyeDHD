import { defineConfig } from 'vite';
import path from 'path';
import { alias } from './vite.aliases';

// https://vitejs.dev/config
export default defineConfig({
	resolve: {
		alias
	},
	optimizeDeps: {
		exclude: ['better-sqlite3', 'ffmpeg-static']
	},
	build: {
		target: 'node16', // or the node/electron target you need
		// keep better-sqlite3 external: don't bundle native node module
		rollupOptions: {
			external: ['better-sqlite3', 'ffmpeg-static']
		}
	}
});
