import { writeBundle } from '@viz/export';

import type {
	CaseOutputBundle,
	WriteCaseBundleOptions,
	WriteCaseBundleResult,
	WrittenArtifact
} from './types';

export function writeCaseBundle(
	bundle: CaseOutputBundle,
	options: WriteCaseBundleOptions
): WriteCaseBundleResult {
	const caseFolderName = options.caseFolderName ?? bundle.caseInfo.caseId;

	const result = writeBundle(bundle.files, {
		rootDir: options.rootDir,
		subDir: caseFolderName,
		png: options.png
	});

	return {
		caseFolderName,
		rootDir: result.rootDir,
		outputDir: result.outputDir,
		artifacts: result.artifacts as WrittenArtifact[]
	};
}
