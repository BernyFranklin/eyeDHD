import type { Vec3 } from "./velocities";
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

        if (isSaccadeSample && start == null) {
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

function buildSaccadeEvent(
    interval: Interval,
    velocities: number[],
    dt: number
): SaccadeEvent {
    const { startIndex, endIndex } = interval;

    // Initialize metrics
    let peak = -Infinity;
    let sumVel = 0;
    let count = 0;

    // amplitudeDeg = sum(vel[i] * dt) across the interval
    let amplitudeDeg = 0;

    // Compute metrics
    for (let i = startIndex; i <= endIndex; i++) {
        const v = velocities[i];
        if (v > peak) peak = v;
        sumVel += v;
        count += 1;
        amplitudeDeg += v * dt;
    }

    const mean = count > 0 ? sumVel / count : 0;

    const startTimeSec = startIndex * dt;
    const endTimeSec = endIndex * dt;
    const durationMs = (endIndex - startIndex) * dt * 1000;

    return {
        startIndex,
        endIndex,
        startTimeSec,
        endTimeSec,
        durationMs,
        peakVelocityDegPerSec: peak,
        meanVelocityDegPerSec: mean,
        amplitudeDeg,
    };
}

function buildExtendedEvent(
    base: SaccadeEvent,
    vectors: Vec3[]
): SaccadeEventExtended {
    // startVector: vector before the first saccadic step (if available)
    const startVector =
        base.startIndex - 1 >= 0 ? vectors[base.startIndex - 1] : vectors[0];

    // endVector: vector at the last saccadic index (if available)
    const endVector =
        base.endIndex >= 0 && base.endIndex < vectors.length
            ? vectors[base.endIndex]
            : vectors[vectors.length - 1];

    // Direction is optional
    const direction: Vec3 = {
        x: endVector.x - startVector.x,
        y: endVector.y - startVector.y,
        z: endVector.z - startVector.z,
    };

    return {
        ...base,
        startVector,
        endVector,
        direction,
    };
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

    const dt = 1 / opts.samplingRate;

    // Compute angular velocities
    const velocitiesDegPerSec = computeAngularVelocitiesDegPerSec(
        vectors,
        opts.samplingRate
    );

    const intervals = findAboveThresholdIntervals(
        velocitiesDegPerSec,
        opts.velocityThresholdDegPerSec
    );

    // Filter by min duration
    const validIntervals = intervals.filter(
        (iv) => intervalDurationMs(iv, dt) >= opts.minDurationMs
    );

    const saccades: SaccadeEvent[] = validIntervals.map((iv) =>
        buildSaccadeEvent(iv, velocitiesDegPerSec, dt)
    );

    const saccadesExtended: SaccadeEventExtended[] = opts.includeExtended
        ? saccades.map((s) => buildExtendedEvent(s, vectors))
        : [];

    return {
        velocitiesDegPerSec,
        saccades,
        saccadesExtended,
    };
}