import type { BundleFileDescriptor } from '@viz/export';
import type { BuildFigureRenderSpecOptions } from '@viz/render';

import type { EyeSelection } from '@pupil/core/schema';
import type { PupilMetricsResult } from '@pupil/metrics/types';
import type { PupilVisualizationModels } from '@pupil/visualization/prep/types';

export interface PupilCaseInfo {
	caseId: string;
	participantId?: string;
	sessionLabel?: string;
	studyLabel?: string;
	sourceFileName?: string;
	generatedAtIso: string;
}

/**
 * Snapshot of the configuration that produced the current run. Persisted as
 * `metadata/pupil-run-config.json` so that re-running with different settings
 * is auditable from the on-disk artifact alone.
 */
export interface PupilRunConfig {
	eye: EyeSelection;
	baselineWindowMs: number;
	baselinePercentile: number;
	epochPreMs: number;
	epochPostMs: number;
	gridStepMs: number;
}

export interface PupilOutputBundleInput {
	caseInfo: PupilCaseInfo;
	runConfig: PupilRunConfig;
	metrics: PupilMetricsResult;
	visualization: PupilVisualizationModels;
	/** Optional per-figure rendering options (title, dimensions, axis overrides, overlays). */
	specOptions?: {
		timeSeries?: BuildFigureRenderSpecOptions;
		normalized?: BuildFigureRenderSpecOptions;
		eventLocked?: BuildFigureRenderSpecOptions;
		/** Applied to every per-event epoch PNG. Title defaults to the event label. */
		eventLockedEpoch?: BuildFigureRenderSpecOptions;
	};
}

export interface PupilOutputBundle {
	caseInfo: PupilCaseInfo;
	runConfig: PupilRunConfig;
	files: BundleFileDescriptor[];
}
