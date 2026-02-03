"use strict";
// Computes angular displacement and angular velocity from 3d gaze data
// Assumptions / conventions:
// - Vectors are expected to be finite numbers.
// - If a vector is not unit length, we normalize it.
// - Velocity is returned in degrees per second.
// - The Wrapper returns an array the same length as samples, with velocities[0] = 0.
Object.defineProperty(exports, "__esModule", { value: true });
exports.angularDisplacementDeg = angularDisplacementDeg;
exports.angularVelocityDegPerSec = angularVelocityDegPerSec;
exports.computeAngularVelocitiesDegPerSec = computeAngularVelocitiesDegPerSec;
// Epsilon for floating point comparisons
var EPS = 1e-12;
// Clamp a numeric value to a closed interval [min, max]
// Protects against floating point drift.
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
function isFiniteNumber(n) {
    return Number.isFinite(n);
}
function isValidVec3(v) {
    if (v === null || typeof v !== 'object')
        return false;
    var obj = v;
    return (isFiniteNumber(obj.x) &&
        isFiniteNumber(obj.y) &&
        isFiniteNumber(obj.z));
}
function magnitude(v) {
    return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2) + Math.pow(v.z, 2));
}
// Normalize 3d vector to unit length
function normalize(v) {
    var mag = magnitude(v);
    if (mag < EPS) {
        throw new Error('Cannot normalize zero-length vector');
    }
    return {
        x: v.x / mag,
        y: v.y / mag,
        z: v.z / mag,
    };
}
// Compute dot product of two 3d vectors
function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
// Compute angular displacement in degrees between two unit vectors
/** @returns angle in degrees */
function angularDisplacementDeg(prev, current) {
    if (!isValidVec3(prev) || !isValidVec3(current)) {
        throw new Error('Invalid Vec3 input');
    }
    // Normalize input vectors
    var u = normalize(prev);
    var v = normalize(current);
    // Clamp protects against floating point precision errors
    var d = clamp(dot(u, v), -1, 1);
    // Calculate angle in radians and convert to degrees
    var angleRad = Math.acos(d);
    var angleDeg = angleRad * (180 / Math.PI);
    return angleDeg;
}
// Compute angular velocity between two samples
// Convrts angular displacement to degrees per second
// This will be the primary signal used later for saccade detection
function angularVelocityDegPerSec(prev, current, dtSeconds) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) {
        throw new Error('Invalid time delta');
    }
    var angleDeg = angularDisplacementDeg(prev, current);
    return angleDeg / dtSeconds;
}
// Compute angular velocity for an entire sequence of samples.
// Applies sliding-pair computation:
// - velocity[i] = velocity between vectors[i-1] and vectors[i]
// The returned array matches the input length so indices stay 
// aligned with the original data
// Convention:
// velocities[0] = 0 because there is no prior sample.
function computeAngularVelocitiesDegPerSec(vectors, samplingRateHz) {
    if (!Array.isArray(vectors)) {
        throw new Error('Input vectors must be an array');
    }
    if (!Number.isFinite(samplingRateHz) || samplingRateHz <= 0) {
        throw new Error('Invalid sampling rate');
    }
    var dt = 1 / samplingRateHz;
    if (vectors.length === 0)
        return [];
    if (vectors.length === 1)
        return [0];
    var velocities = new Array(vectors.length);
    velocities[0] = 0; // First velocity is zero by convention
    for (var i = 1; i < vectors.length; i++) {
        velocities[i] = angularVelocityDegPerSec(vectors[i - 1], vectors[i], dt);
    }
    return velocities;
}
