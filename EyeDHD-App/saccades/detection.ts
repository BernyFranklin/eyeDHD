import { computeAngularVelocitiesDegPerSec } from "./velocities";
import type { Vec3 } from "./velocities";
import type {
    SaccadeEvent,
    SaccadeEventExtended,
    SaccadeDetectionOptions,
} from "./schema";

export interface DetectSaccadeResult {
    velocitiesDegPerSec: number [];
    saccades: SaccadeEvent[];
    saccadesExtended: SaccadeEventExtended[];
}

export function detectSaccadesFromVectors(
    vectors: Vec3[],
    options?: Partial<SaccadeDetectionOptions> & 
              Pick<SaccadeDetectionOptions, "samplingRate"> 
): DetectSaccadeResult {
    // Temp stub implementation
    return {
        velocitiesDegPerSec: new Array(vectors.length).fill(0),
        saccades: [],
        saccadesExtended: [],
    };
}

// export function detectSaccadesFromVectors(...) {...}