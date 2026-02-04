import type { Vec3 } from "./velocities.ts";
import { computeAngularVelocitiesDegPerSec } from "./velocities";
import type {
    SaccadeEvent,
    SaccadeEventExtended,
    SaccadeDetectionOptions,
} from "./schema";
import { DEFAULT_SACCADE_OPTIONS } from "./schema";

export interface DetectSaccadeResult {
    velocitiesDegPerSec: number [];
    saccades: SaccadeEvent[];
    saccadesExtended: SaccadeEventExtended[];
}

type Interval = { startIndex: number; endIndex: number };   // Inclusive

function findAboveThresholdIntervals(
    velocities: number[],
    threshold: number
): Interval[] {
    const intervals: Interval[] = [];
    let start: number | null = null;

    // Start at 1 because velocities[0] is always 0 by convention
    for (let i = 1; i < velocities.length; i++) {
        // Check if current sample is above threshold
        const isSaccadeSample = velocities[i] >= threshold;

        if (isSaccadeSample && start !== null) {
            start = i;  // Mark start of new interval
        }
        else if (!isSaccadeSample && start !== null){
            // End of an interval
            intervals.push({ startIndex: start, endIndex: i -1 });
            // Reset start for next potential interval
            start = null;
        }
    }

    // Close an open interval at end
    if (start !== null) {
        intervals.push({ startIndex: start, endIndex: velocities.length - 1 });
    }

    return intervals;
}

function intervalDurationMs(interval: Interval, dt: number): number {
    // Locked convention: (end - start) * dt
    // 1000 to convert to milliseconds
    return (interval.endIndex - interval.startIndex) * dt * 1000;
}



export function detectSaccadesFromVectors(
    vectors: Vec3[],
    options?: Partial<SaccadeDetectionOptions>
): DetectSaccadeResult {
    // Merge user options with defaults
    const opts: SaccadeDetectionOptions = {
        ...DEFAULT_SACCADE_OPTIONS,
        ...options,
    };

    const velocitiesDegPerSec = computeAngularVelocitiesDegPerSec(
        vectors,
        opts.samplingRate
    );

    return {
        velocitiesDegPerSec,
        saccades: [],
        saccadesExtended: [],
    };
}