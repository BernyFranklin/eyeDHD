import path from 'node:path';

import { serializeCsvRows, serializeJsonValue } from './serializers';
import type {
  CaseOutputBundle,
  WriteCaseBundleOptions,
	WriteCaseBundleResult,
	WrittenArtifact
} from './types';

// Stub implementations. TO-DO: Implement

export function writeCaseBundle(
	bundle: CaseOutputBundle,
	options: WriteCaseBundleOptions
): WriteCaseBundleResult {
	const caseFolderName = options.caseFolderName ?? '';
	const outputDir = path.join(options.rootDir, caseFolderName);

	const artifacts: WrittenArtifact[] = bundle.files.map((file) => {
		void file;
		return {
			key: file.key,
			absolutePath: path.join(outputDir, file.relativePath),
			relativePath: file.relativePath,
			format: file.format,
			category: file.category,
			bytes: 0,
			skipped: true
		};
	});

  void bundle;
	void serializeCsvRows;
	void serializeJsonValue;

	return {
		caseFolderName,
		rootDir: options.rootDir,
		outputDir,
		artifacts
	};
}
