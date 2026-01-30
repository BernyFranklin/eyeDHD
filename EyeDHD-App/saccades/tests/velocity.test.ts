import { describe, it, expect } from 'vitest';
import {
    angularDisplacementDeg,
    angularVelocityDegPerSec,
    computeAngularVelocitiesDegPerSec,
    type Vec3,
} from '../velocities';

const DT_200HZ = 1/200; // 0.005s
const EPS = 1e-6;       // Epsilon for floating-point comparisons

function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

function makeUnitVecXY(deg: number): Vec3 {
    const r = degToRad(deg);
    return {
        x: Math.cos(r),
        y: Math.sin(r),
        z: 0,
    };
}

describe('velocity.ts', () => {
    it("1) Zero movement -> displacement 0 deg and velocity 0 deg/sec", () => {
        const v0: Vec3 = { x: 1, y: 0, z: 0 };
        const v1: Vec3 = { x: 1, y: 0, z: 0 };

        expect(angularDisplacementDeg(v0, v1)).toBeCloseTo(0, 10);
        expect(angularVelocityDegPerSec(v0, v1, DT_200HZ)).toBeCloseTo(0, 10);
    });

    it("2) 90 deg change in one frame @200Hz -> 18000 deg/sec", () => {
        const v0: Vec3 = { x: 1, y: 0, z: 0 };
        const v1: Vec3 = { x: 0, y: 1, z: 0 };

        expect(angularDisplacementDeg(v0, v1)).toBeCloseTo(90, 10);
        expect(angularVelocityDegPerSec(v0, v1, DT_200HZ)).toBeCloseTo(18000, 6);
    });

    it("3) 60 deg change in one frame @200Hz -> 12000 deg/sec", () => {
        const v0: Vec3 = { x: 1, y: 0, z: 0 };
        const v1: Vec3 = { x:0.5, y: Math.sqrt(3)/2, z: 0 }; // 60 deg unit vector

        expect(angularDisplacementDeg(v0, v1)).toBeCloseTo(60, 10);
        expect(angularVelocityDegPerSec(v0, v1, DT_200HZ)).toBeCloseTo(12000, 6);
    });

    it("4) ~1 deg change in one frame @200Hz -> 200 deg/sec", () => {
        const v0: Vec3 = { x:1, y:0, z:0 };
        const v1: Vec3 = makeUnitVecXY(1); // ~1 deg unit vector

        expect(angularDisplacementDeg(v0, v1)).toBeCloseTo(1, 6);
        expect(angularVelocityDegPerSec(v0, v1, DT_200HZ)).toBeCloseTo(200, 4);
    });

    it("5) Invalid input throws error", () => {
        const good: Vec3 = { x:1, y:0, z:0 };
        const bad1 = { x: 1, y: 0 };        // Missing z
        const bad2 = { x: 1, y: Number.NaN, z: 0 }; // NaN value


        expect(() => angularDisplacementDeg(good, bad1 as any)).toThrow();
        expect(() => angularDisplacementDeg(good, bad2 as any)).toThrow();
        expect(() => angularVelocityDegPerSec(good, bad1 as any, DT_200HZ)).toThrow();
        expect(() => angularVelocityDegPerSec(good, good, 0)).toThrow();    // Invalid dt
    });

    it("6) Wrapper output matches input length; velocities[0] = 0", () => {
        const vectors: Vec3[] = [
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
        ];

        const velocities = computeAngularVelocitiesDegPerSec(vectors, 200);
        
        expect(velocities.length).toBe(vectors.length);
        expect(velocities[0]).toBe(0);
        expect(velocities[1]).toBeCloseTo(0, 10);
        expect(velocities[2]).toBeCloseTo(18000, 6);
    });

    it("7) Constant 1 deg rotation per frame -> constant 200 deg/sec (except index 0)", () => {
        const vectors: Vec3[] = [
            makeUnitVecXY(0),
            makeUnitVecXY(1),
            makeUnitVecXY(2),
            makeUnitVecXY(3),

        ];

        const velocities = computeAngularVelocitiesDegPerSec(vectors, 200);

        // Each step is 1 deg over 0.005s => 200 deg/sec
        expect(Math.abs(velocities[1] - 200)).toBeLessThan(EPS + 1e-3);
        expect(Math.abs(velocities[2] - 200)).toBeLessThan(EPS + 1e-3);
        expect(Math.abs(velocities[3] - 200)).toBeLessThan(EPS + 1e-3);
    });
});