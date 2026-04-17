import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
	packagerConfig: {
		asar: {
			unpack: '**/node_modules/ffmpeg-static/**'
		},
		// The VitePlugin sets ignore to only include `.vite/` by default.
		// We override it here to also include native/binary modules that are
		// marked external in vite.main.config.ts and can't be bundled.
		ignore: (file: string) => {
			if (!file) return false;
			if (file.startsWith('/.vite')) return false;
			if (file.startsWith('/node_modules/better-sqlite3')) return false;
			if (file.startsWith('/node_modules/skia-canvas')) return false;
			if (file.startsWith('/node_modules/ffmpeg-static')) return false;
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
