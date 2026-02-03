"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SACCADE_OPTIONS = void 0;
// Default params for saccade detection
// Tuned for Varjo headset at 200 Hz
exports.DEFAULT_SACCADE_OPTIONS = {
    velocityThresholdDegPerSec: 100,
    minDurationMs: 10,
    maxDurationMs: 150,
    includeExtended: true,
};
