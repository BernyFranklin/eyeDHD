import type { PngFigureRenderBackend, RenderBackground } from '@viz/render/backends/types';

export type BundleFileFormat = 'csv' | 'json' | 'png';

export interface BundleFileDescriptor<T = unknown> {
	key: string;
	relativePath: string;
	format: BundleFileFormat;
	category: string;
	optional: boolean;
	content: T;
}

export interface PngWriteOptions {
	backend: PngFigureRenderBackend;
	dpi: number;
	background: RenderBackground;
}

export interface WriteBundleOptions {
	rootDir: string;
	subDir?: string;
	png?: PngWriteOptions;
}

export interface WrittenArtifact {
	key: string;
	absolutePath: string;
	relativePath: string;
	format: BundleFileFormat;
	category: string;
	bytes: number;
	skipped: boolean;
}

export interface WriteBundleResult {
	rootDir: string;
	outputDir: string;
	artifacts: WrittenArtifact[];
}
