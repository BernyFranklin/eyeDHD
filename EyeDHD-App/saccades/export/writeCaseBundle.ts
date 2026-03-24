import path from 'node:path';

import { serializeCsvRows, serializeJsonValue } from './serializers';
import type {
  CaseOutputBundle,
  WriteCaseBundleOptions,
  WriteCaseBundleResult,
  WrittenArtifact,
} from './types';


// Stub implementations. TO-DO: Implement

export function writeCaseBundle(
  bundle: CaseOutputBundle,
  options: WriteCaseBundleOptions
): WriteCaseBundleResult {
  void serializeCsvRows;
  void serializeJsonValue;

  const caseFolderName = options.caseFolderName ?? '';
  const outputDir = path.join(options.rootDir, caseFolderName);

  const artifacts: WrittenArtifact[] = bundle.files.map((file) => ({
    key: file.key,
    absolutePath: path.join(outputDir, file.relativePath),
    relativePath: file.relativePath,
    format: file.format,
    category: file.category,
    bytes: 0,
    skipped: true,
  }));

  return {
    caseFolderName,
    rootDir: options.rootDir,
    outputDir,
    artifacts,
  };
}