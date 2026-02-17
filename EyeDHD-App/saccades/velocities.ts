// Computes angular displacement and angular velocity from 3d gaze data
// Assumptions / conventions:
// - Vectors are expected to be finite numbers.
// - If a vector is not unit length, we normalize it.
// - Velocity is returned in degrees per second.
// - The Wrapper returns an array the same length as samples, with velocities[0] = 0.

// Interface for a 3D vector
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

// Epsilon for floating point comparisons
const EPS = 1e-12;

// Clamp a numeric value to a closed interval [min, max]
// Protects against floating point drift.
function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function isFiniteNumber(n: number): boolean {
    return Number.isFinite(n);
}

function isValidVec3(v: Vec3): boolean {
    if (v === null || typeof v !== 'object') return false;
    const obj = v as Vec3;

    return (
        isFiniteNumber(obj.x as number) &&
        isFiniteNumber(obj.y as number) &&
        isFiniteNumber(obj.z as number)
    );
}

function magnitude(v: Vec3): number {
    return Math.sqrt(v.x**2 + v.y**2 + v.z**2);
}

// Normalize 3d vector to unit length
function normalize(v: Vec3): Vec3 {
    const mag = magnitude(v);
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
function dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Compute angular displacement in degrees between two unit vectors
/** @returns angle in degrees */
export function angularDisplacementDeg(prev: Vec3, current: Vec3): number {
    if (!isValidVec3(prev) || !isValidVec3(current)) {
        throw new Error('Invalid Vec3 input');
    }

    // Normalize input vectors
    const u = normalize(prev);
    const v = normalize(current);

    // Clamp protects against floating point precision errors
    const d = clamp(dot(u, v), -1, 1);

    // Calculate angle in radians and convert to degrees
    const angleRad = Math.acos(d);
    const angleDeg = angleRad * (180 / Math.PI);

    return angleDeg;
}

// Compute angular velocity between two samples
// Convrts angular displacement to degrees per second
// This will be the primary signal used later for saccade detection
export function angularVelocityDegPerSec(
    prev: Vec3,
    current: Vec3,
    dtSeconds: number
): number {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) {
        throw new Error('Invalid time delta');
    }

    const angleDeg = angularDisplacementDeg(prev, current);
    return angleDeg / dtSeconds;
}

// Compute angular velocity for an entire sequence of samples.

// Applies sliding-pair computation:
// - velocity[i] = velocity between vectors[i-1] and vectors[i]

// The returned array matches the input length so indices stay 
// aligned with the original data

// Convention:
// velocities[0] = 0 because there is no prior sample.
export function computeAngularVelocitiesDegPerSec(
    vectors: Vec3[],
    samplingRateHz: number
): number[] {
    if (!Array.isArray(vectors)) {
        throw new Error('Input vectors must be an array');
    }
    if (!Number.isFinite(samplingRateHz) || samplingRateHz <= 0) {
        throw new Error('Invalid sampling rate');
    }

    const dt = 1 / samplingRateHz;

    if (vectors.length === 0) return [];
    if (vectors.length === 1) return [0];

    const velocities: number[] = new Array(vectors.length);
    velocities[0] = 0; // First velocity is zero by convention

    for (let i = 1; i < vectors.length; i++) {
        velocities[i] = angularVelocityDegPerSec(
            vectors[i - 1],
            vectors[i],
            dt
        );
    }
    
    return velocities;
}
