import type { Vec3 } from "./velocities.ts";
import type {
    SaccadeEvent,
    SaccadeEventExtended,
    SaccadeDetectionOptions,
} from "./schema";
import { DEFAULT_SACCADE_OPTIONS } from "./schema";
import { computeAngularVelocitiesDegPerSec } from "./velocities";

export interface DetectSaccadeResult {
    velocitiesDegPerSec: number [];
    saccades: SaccadeEvent[];
    saccadesExtended: SaccadeEventExtended[];
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

// export function detectSaccadesFromVectors(...) {...}