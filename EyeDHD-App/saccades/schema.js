"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SACCADE_OPTIONS = exports.DEFAULT_SAMPLING_RATE_HZ = void 0;
exports.DEFAULT_SAMPLING_RATE_HZ = 200; // Default for Varjo headset
// Default params for saccade detection
// Tuned for Varjo headset at 200 Hz
exports.DEFAULT_SACCADE_OPTIONS = {
    samplingRate: exports.DEFAULT_SAMPLING_RATE_HZ,
    velocityThresholdDegPerSec: 100,
    minDurationMs: 10,
    maxDurationMs: 150,
    includeExtended: true,
};
