export type EyeSelection = 'left' | 'right' | 'mean';

export interface PupilSample {
	timeMs: number;
	leftMm: number | null;
	rightMm: number | null;
}

export interface PupilAnalysisOptions {
	/** Which eye's pupil signal to analyze. 'mean' averages left and right when both are valid. */
	eye: EyeSelection;
	/** Sliding-window size used by the rolling baseline, in milliseconds. */
	baselineWindowMs: number;
	/** Percentile (0–1) of the in-window distribution used as the baseline. */
	baselinePercentile: number;
	/** ERP epoch window: ms before each event to include. */
	epochPreMs: number;
	/** ERP epoch window: ms after each event to include. */
	epochPostMs: number;
	/** Per-segment epoch window: ms before each segment start to include in the figure. */
	segmentEpochPreMs: number;
	/** Per-segment epoch window: ms after each segment end to include in the figure. */
	segmentEpochPostMs: number;
}

export const DEFAULT_PUPIL_OPTIONS: PupilAnalysisOptions = {
	eye: 'mean',
	baselineWindowMs: 15_000,
	baselinePercentile: 0.10,
	epochPreMs: 500,
	epochPostMs: 3_000,
	segmentEpochPreMs: 5_000,
	segmentEpochPostMs: 5_000,
};
