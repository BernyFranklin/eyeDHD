import fs from 'node:fs';
import path from 'node:path';

import { renderPngFigure } from '@saccades/visualization/render';
import type { FigureRenderSpec } from '@saccades/visualization/render';

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
	const caseFolderName = options.caseFolderName ?? bundle.caseInfo.caseId;
	const outputDir = path.join(options.rootDir, caseFolderName);

	const artifacts: WrittenArtifact[] = bundle.files.map((file) =>
		writeArtifact(file, outputDir, options)
	);

	return {
		caseFolderName,
		rootDir: options.rootDir,
		outputDir,
		artifacts
	};
}

function writeArtifact(
	file: CaseOutputFileDescriptor<unknown>,
	outputDir: string,
	options: WriteCaseBundleOptions
): WrittenArtifact {
	const absolutePath = path.join(outputDir, file.relativePath);

	if (file.format === 'png') {
		return writePngArtifact(file, absolutePath, options);
	}

	const serialized = serializeArtifactContent(file);
	const bytes = Buffer.byteLength(serialized, 'utf8');
	fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
	fs.writeFileSync(absolutePath, serialized, 'utf8');

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

function writePngArtifact(
	file: CaseOutputFileDescriptor<unknown>,
	absolutePath: string,
	options: WriteCaseBundleOptions
): WrittenArtifact {
	if (!options.png) {
		throw new Error('PNG backend is required when png descriptors are present');
	}

	const spec = file.content as FigureRenderSpec;
	const rendered = renderPngFigure(spec, options.png.backend, {
		dpi: options.png.dpi,
		background: options.png.background
	});

	fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
	fs.writeFileSync(absolutePath, rendered.data);

	return {
		key: file.key,
		absolutePath,
		relativePath: file.relativePath,
		format: file.format,
		category: file.category,
		bytes: rendered.data.byteLength,
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
