import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import fs from 'fs';
import path from 'path';

// Modules marked external in vite.main.config.ts — they must exist on disk at
// runtime because Rollup can't bundle their native `.node` binaries or
// shipped executables.
const NATIVE_ROOTS = ['better-sqlite3', 'skia-canvas', 'ffmpeg-static'];

// Walk the dependency graph to collect every package the native roots need at
// runtime. Keeps the ignore list in sync with package.json automatically.
function collectRuntimeDeps(roots: string[]): Set<string> {
	const projectRoot = __dirname;
	const visited = new Set<string>();
	const resolvePackage = (name: string, startDir: string): string | null => {
		let dir = startDir;
		while (true) {
			const candidate = path.join(dir, 'node_modules', name, 'package.json');
			if (fs.existsSync(candidate)) return candidate;
			const parent = path.dirname(dir);
			if (parent === dir) return null;
			dir = parent;
		}
	};
	const walk = (name: string, fromDir: string) => {
		if (visited.has(name)) return;
		const pjPath = resolvePackage(name, fromDir);
		if (!pjPath) return;
		visited.add(name);
		const pkg = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
		const deps = Object.keys(pkg.dependencies || {});
		const nextDir = path.dirname(pjPath);
		for (const d of deps) walk(d, nextDir);
	};
	for (const r of roots) walk(r, projectRoot);
	return visited;
}

const RUNTIME_DEPS = collectRuntimeDeps(NATIVE_ROOTS);

const config: ForgeConfig = {
	packagerConfig: {
		asar: {
			unpack: '**/node_modules/ffmpeg-static/**'
		},
		// VitePlugin's default ignore keeps only `.vite/`. We widen it to keep
		// the runtime-dep closure of modules marked external in
		// vite.main.config.ts (computed above). Parent directories must be
		// allowed or the walker won't descend into them.
		ignore: (file: string) => {
			if (!file) return false;
			if (file === '/package.json') return false;
			if (file === '/.vite' || file.startsWith('/.vite/')) return false;
			if (file === '/node_modules') return false;
			const m = file.match(/^\/node_modules\/((?:@[^/]+\/)?[^/]+)(\/|$)/);
			if (m && RUNTIME_DEPS.has(m[1])) return false;
			return true;
		}
	},
	rebuildConfig: {
		force: true,
		onlyModules: ['better-sqlite3']
	},
	makers: [
		new MakerSquirrel({}),
		new MakerZIP({}, ['darwin']),
		new MakerRpm({}),
		new MakerDeb({})
	],
	plugins: [
		new VitePlugin({
			// `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
			// If you are familiar with Vite configuration, it will look really familiar.
			build: [
				{
					// `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
					entry: 'electron/main.ts',
					config: 'vite.main.config.ts',
					target: 'main'
				},
				{
					entry: 'electron/preload.ts',
					config: 'vite.preload.config.ts',
					target: 'preload'
				}
			],
			renderer: [
				{
					name: 'main_window',
					config: 'vite.renderer.config.ts'
				}
			]
		}),
		new AutoUnpackNativesPlugin({}),
		// Fuses are used to enable/disable various Electron functionality
		// at package time, before code signing the application
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true
		})
	]
};

export default config;
