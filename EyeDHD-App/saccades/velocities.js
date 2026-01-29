// Computes angular displacement and angular velocity from 3d gaze data
// Assumptions / conventions:
// - Vectors are expected to be finite numbers.
// - If a vector is not unit length, we normalize it.
// - Velocity is returned in degrees per second.
// - The Wrapper returns an array the same length as samples, with velocities[0] = 0.

const EPS = 1e-12;

/**
 * Object representing a 3D vector.
 * @typedef {Object} Vec3
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * Clamps a value between min and max.
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}