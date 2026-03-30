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
	// Compute the absolute path for this artifact by joining the output directory with the relative path
	const absolutePath = path.join(outputDir, file.relativePath);
	// If PNG format, mark as skipped since PNG writing is not handled here
	// PNG Outputs are modeled here for deterministic export planning,
	// but binary image rendering/writing is deferred to  later layer
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
	// Serialize the artifact content to a string using the appropriate serializer
	const serialized = serializeArtifactContent(file);
	const bytes = Buffer.byteLength(serialized, 'utf8');
	// Return the written artifact result including the serialized byte length
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
	// If JSON format, serialize the content using the JSON serializer
	if (file.format === 'json') {
		return serializeJsonValue(file.content);
	}
	// If CSV, serialize the content using the CSV serializer
	if (file.format === 'csv') {
		if (!Array.isArray(file.content)) {
			throw new Error(`CSV artifact "${file.key}" must contain an array of rows.`);
		}
		return serializeCsvRows(file.content as Record<string, unknown>[]);
	}
	// If neither JSON nor CSV, return an empty string
	return '';
}
