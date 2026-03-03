import { type Electron, type Renderer } from '../electron/preload';

declare module "*.css";

export {};

/**
 * Global declaration to extend the Window interface with electron and renderer
 * properties.
 *
 * This allows us to access Electron APIs and renderer-specific functions from anywhere
 * in the frontend code without needing to import these types in every file. The electron
 * property provides access to the Electron/Renderer APIs defined in the preload script
 */
declare global {
	interface Window {
		electron: Electron;
		renderer: Renderer;
	}
}