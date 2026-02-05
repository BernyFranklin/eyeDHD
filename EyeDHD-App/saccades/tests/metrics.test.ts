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

    it('A2) Computes derived fields for multiple saccades and preserve order', () => {
        const input = [
            { startTime: 2000, endTime: 2100, amplitudeDeg: 2  },   // 100ms, 0.1s, 20deg/s
            { startTime: 500,  endTime: 520,  amplitudeDeg: 1  },   // 20ms, 0.02s, 50deg/s
            { startTime: 9000, endTime: 9050, amplitudeDeg: 10 }    // 50ms, 0.05s, 200deg/s
        ];

        const result = computeSaccadeMetrics(input);
        expect(result.perSaccade.length).toBe(3);

        // Order preserved: index 0 corresponds to the first input saccade, etc.
        expect(result.perSaccade[0].durationMs).toBe(100);
        expect(result.perSaccade[0].durationSec).toBeCloseTo(0.1, 6);
        expect(result.perSaccade[0].ratePerSec).toBeCloseTo(20, 6);

        expect(result.perSaccade[1].durationMs).toBe(20);
        expect(result.perSaccade[1].durationSec).toBeCloseTo(0.02, 6);
        expect(result.perSaccade[1].ratePerSec).toBeCloseTo(50, 6);

        expect(result.perSaccade[2].durationMs).toBe(50);
        expect(result.perSaccade[2].durationSec).toBeCloseTo(0.05, 6);
        expect(result.perSaccade[2].ratePerSec).toBeCloseTo(200, 6);
    });

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