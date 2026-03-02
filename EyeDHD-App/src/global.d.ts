import { type Electron, type Renderer } from '../electron/preload';

declare module "*.css";

export {};

// Exposes Electron and Renderer types globally on the window object
// so they can be used in the frontend without importing
declare global {
  interface Window {
    electron: Electron;
    renderer: Renderer;
  }
}