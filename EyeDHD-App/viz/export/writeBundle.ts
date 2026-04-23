import fs from 'node:fs';
import path from 'node:path';

import { renderPngFigure } from '@viz/render';
import type { FigureRenderSpec } from '@viz/render';

import { serializeCsvRows, serializeJsonValue } from './serializers';
import type {
	BundleFileDescriptor,
	WriteBundleOptions,
	WriteBundleResult,
	WrittenArtifact
} from './types';

export function writeBundle(
	files: ReadonlyArray<BundleFileDescriptor>,
	options: WriteBundleOptions
): WriteBundleResult {
	const outputDir = options.subDir
		? path.join(options.rootDir, options.subDir)
		: options.rootDir;

	const artifacts: WrittenArtifact[] = files.map((file) =>
		writeArtifact(file, outputDir, options)
	);

	return {
		rootDir: options.rootDir,
		outputDir,
		artifacts
	};
}

function writeArtifact(
	file: BundleFileDescriptor,
	outputDir: string,
	options: WriteBundleOptions
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
	file: BundleFileDescriptor,
	absolutePath: string,
	options: WriteBundleOptions
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

function serializeArtifactContent(file: BundleFileDescriptor): string {
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
