export type ExportFileFormat = 'csv' | 'json' | 'png';

export type ExportFileCategory =
    | 'metadata'
	| 'cleaned'
	| 'analysis'
	| 'visuals'
	| 'animation';

export interface WriteCaseBundleOptions {
	rootDir: string;
	caseFolderName?: string;
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


// Local Write Layer facing copy of the Step 7 descriptor contract.

export interface CaseOutputFileDescriptor<T> {
	key: string;
	relativePath: string;
	format: ExportFileFormat;
	category: ExportFileCategory;
	optional: boolean;
	content: T;
}

export interface CaseInfo {
	participantId: string;
	caseId: string;
	sessionLabel: string;
	studyLabel: string;
	generatedAtIso: string;
}

export interface CaseOutputBundle {
	caseInfo: CaseInfo;
	runConfig: Record<string, unknown>;
	tables: Record<string, unknown>;
	visuals: Record<string, unknown>;
	animation?: Record<string, unknown>;
	files: CaseOutputFileDescriptor<unknown>[];
}
