import path from 'node:path';

import { serializeCsvRows, serializeJsonValue } from './serializers';
import type {
  	CaseOutputBundle,
	CaseOutputFileDescriptor,
  	WriteCaseBundleOptions,
	WriteCaseBundleResult,
	WrittenArtifact
} from './types';

export function writeCaseBundle(
	bundle: CaseOutputBundle,
	options: WriteCaseBundleOptions
): WriteCaseBundleResult {
	// Determine the folder name for this case
	const caseFolderName = options.caseFolderName ?? bundle.caseInfo.caseId;
	// Determine the full output directory for this case
	const outputDir = path.join(options.rootDir, caseFolderName);
	// Map each file in the bundle to a written artifact
	const artifacts: WrittenArtifact[] = bundle.files.map((file) => 
		buildArtifactResult(file, outputDir)
	);
	
	// Return the result of writing the case bundle
	return {
		caseFolderName,
		rootDir: options.rootDir,
		outputDir,
		artifacts
	};
}

function buildArtifactResult(
	file: CaseOutputFileDescriptor<unknown>,
	outputDir: string
): WrittenArtifact {
	const absolutePath = path.join(outputDir, file.relativePath);

	if (file.format === 'png') {
		return {
			key: file.key,
			absolutePath,
			relativePath: file.relativePath,
			format: file.format,
			category: file.category,
			bytes: 0,
			skipped: true,
		};
	}

	const serialized = serializeArtifactContent(file);
	const bytes = Buffer.byteLength(serialized, 'utf8');

	return {
		key: file.key,
		absolutePath,
		relativePath: file.relativePath,
		format: file.format,
		category: file.category,
		bytes,
		skipped: false,
	};
}

function serializeArtifactContent(file: CaseOutputFileDescriptor<unknown>): string {
	if (file.format === 'json') {
		return serializeJsonValue(file.content);
	}
	if (file.format === 'csv') {
		return serializeCsvRows(file.content as Record<string, unknown>[]);
	}
	return '';
}
