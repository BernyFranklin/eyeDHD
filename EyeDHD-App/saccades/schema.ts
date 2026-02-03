import type { Vec3 } from './velocities';

// Schema for saccade detection parameters
export interface SaccadeEvent {
    startIndex: number;                     // Index of the start of the saccade in the data array
    endIndex: number;                       // Index of the end of the saccade in the data array

    startTimeSec: number;                   // Time in seconds at the start of the saccade
    endTimeSec: number;                     // Time in seconds at the end of the saccade
    durationSec: number;                    // Duration of the saccade in seconds

    peakVelocityDegPerSec: number;          // Peak angular velocity during the saccade in degrees per second
    meanVelocityDegPerSec: number;          // Mean angular velocity during the saccade in degrees per second

    amplitudeDeg: number;                   // Angular displacement during the saccade in degrees
}

export interface SaccadeEventExtended extends SaccadeEvent {
    direction?: Vec3;                       // Optional: Direction vector of the saccade
    startVector?: Vec3;                     // Optional: Eye position vector at the start of the saccade
    endVector?: Vec3;                       // Optional: Eye position vector at the end of the saccade
}

export interface SaccadeDetectionOptions {
    samplingrate: number;                   // Sampling rate in Hz
    velocityThresholdDegPerSec: number ;    // Velocity threshold for saccade detection in degrees per second
    minDurationMs: number;                  // Minimum duration of a saccade in milliseconds
    maxDurationMs: number;                  // Maximum duration of a saccade in milliseconds
}