import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    target: 'node16', // or the node/electron target you need
    // keep better-sqlite3 external: don't bundle native node module
    rollupOptions: {
      external: ['electron', 'better-sqlite3']
    },
    // Pass options through to @rollup/plugin-commonjs
    commonjsOptions: {
      // If the plugin complains about dynamic requires, list the .node targets
      // Adjust these globs/paths to where the .node files actually live in your project
      dynamicRequireTargets: [
        // and a glob for typical node_modules locations for this package
        path.resolve(__dirname, 'node_modules/better-sqlite3/build/**')
      ]
      // optional: leave dynamic requires alone instead of trying to analyze them
      // ignoreDynamicRequires: false
    }
  }
});
