import { defineConfig } from 'vite';
import { alias } from './vite.aliases';


// https://vitejs.dev/config
export default defineConfig({
	resolve: {
		alias
	}
});
