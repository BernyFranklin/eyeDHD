import { describe, it, expect } from 'vitest';
import {computeSaccadeMetrics } from '../metrics'

describe('Saccade Metrics', () => {
    // Derived fields
    it('A1) Computes derived per-saccade fields', () => {
        const input = [
            {
                startTime: 1000,    // ms
                endTime: 1050,      // ms
                amplitudeDeg: 5        // degrees
            }
        ];

        const result = computeSaccadeMetrics(input);
        expect(result.perSaccade.length).toBe(1);

        const saccade = result.perSaccade[0];
        expect(saccade.durationMs).toBe(50);
        expect(saccade.durationSec).toBeCloseTo(0.05, 6);
        expect(saccade.ratePerSec).toBeCloseTo(100, 6);
    });

    it('A2)', () => {});
    it('B1)', () => {});
    it('B2)', () => {});
    it('B3)', () => {});
    it('A3)', () => {});
    it('C1)', () => {});
    it('C2)', () => {});
    it('C3)', () => {});
    it('D1)', () => {});
    it('D2)', () => {});
    it('D3)', () => {});
    it('D4)', () => {});
    it('E1)', () => {});
    it('E2)', () => {});
    it('E3)', () => {});
    it('F1)', () => {});
    it('F2)', () => {});
    it('F3)', () => {});
    it('F4)', () => {});
    it('F5)', () => {});
    it('G1)', () => {});
    it('G2)', () => {});
    it('G3)', () => {});
    it('H1)', () => {});
})