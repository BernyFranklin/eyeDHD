import type { Vec3 } from "./velocities.js";
import type {
    SaccadeEvent,
    SaccadeEventExtended,
    SaccadeDetectionOptions,
} from "./schema.js";
import { DEFAULT_SACCADE_OPTIONS } from "./schema.js";

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
    // Used to suppress unused variable warning: remove later
    console.log("Saccade detection options:", opts);

    // Temp stub implementation
    return {
        velocitiesDegPerSec: new Array(vectors.length).fill(0),
        saccades: [],
        saccadesExtended: [],
    };
}

// export function detectSaccadesFromVectors(...) {...}