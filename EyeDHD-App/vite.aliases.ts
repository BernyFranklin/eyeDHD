import path from 'path';
import type { AliasOptions } from 'vite';

const srcRoot = path.resolve(__dirname, 'src');
const electronRoot = path.resolve(__dirname, 'electron');
const saccadesRoot = path.resolve(__dirname, 'saccades');

export const alias: AliasOptions = {
	'@src': srcRoot,
	'@electron': electronRoot,
	'@saccades': saccadesRoot
};