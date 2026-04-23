import path from 'path';
import type { AliasOptions } from 'vite';

const srcRoot = path.resolve(__dirname, 'src');
const electronRoot = path.resolve(__dirname, 'electron');
const saccadesRoot = path.resolve(__dirname, 'saccades');
const vizRoot = path.resolve(__dirname, 'viz');
const pupilRoot = path.resolve(__dirname, 'pupil');

export const alias: AliasOptions = {
	'@src': srcRoot,
	'@electron': electronRoot,
	'@saccades': saccadesRoot,
	'@viz': vizRoot,
	'@pupil': pupilRoot
};