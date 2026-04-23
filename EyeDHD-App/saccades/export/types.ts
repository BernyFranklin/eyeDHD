import type { PngFigureRenderBackend, RenderBackground } from '@viz/render/backends/types';

export type {
	CaseOutputFileDescriptor,
	CaseInfo,
	CaseOutputBundle,
	CaseOutputTables,
	CaseOutputVisualModels,
} from '@saccades/outputs/caseBundle';

export type ExportFileFormat = 'csv' | 'json' | 'png';

export type ExportFileCategory =
	| 'metadata'
	| 'cleaned'
	| 'analysis'
	| 'visuals'
	| 'animation';

export interface PngExportOptions {
	backend: PngFigureRenderBackend;
	dpi: number;
	background: RenderBackground;
}

export interface WriteCaseBundleOptions {
	rootDir: string;
	caseFolderName?: string;
	png?: PngExportOptions;
}

export interface WrittenArtifact {
	key: string;
	absolutePath: string;
	relativePath: string;
	format: ExportFileFormat;
	category: ExportFileCategory;
	bytes: number;
	skipped: boolean;
}

export interface WriteCaseBundleResult {
	caseFolderName: string;
	rootDir: string;
	outputDir: string;
	artifacts: WrittenArtifact[];
}
