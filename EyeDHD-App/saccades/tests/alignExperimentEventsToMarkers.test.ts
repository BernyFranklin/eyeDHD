import { describe, expect, it } from 'vitest'
import { alignExperimentEventsToMarkers } from '@saccades/ingest/alignment//alignExperimentEventsToMarkers'
import type { ExperimentMarker } from '@saccades/ingest/segmentation/types'
import type { RawExperimentEvent } from '@saccades/ingest/alignment/types'

describe('Event Alignment Layer', () => {
    describe('A — Normalization', () => {
        it('A1 — converts valid raw events into ExperimentMarker objects with normalized uppercase underscore-separated types', () => {
            const events: RawExperimentEvent[] = [                 // Load typical raw events with various type formats
            { timeNs: 100, type: 'trial start' },
            { timeNs: 200, type: 'distractor on' },
            { timeNs: 300, type: 'response made' },
            ]

            const result = alignExperimentEventsToMarkers(events)  // Align events to markers

            expect(result.markers).toEqual<ExperimentMarker[]>([   // Expect normalized types in the output markers
            { timeNs: 100, type: 'TRIAL_START' },
            { timeNs: 200, type: 'DISTRACTOR_ON' },
            { timeNs: 300, type: 'RESPONSE_MADE' },
            ])
        })

        it('A2 — normalizes leading/trailing spaces and repeated internal whitespace', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 100, type: ' Trial Start ' },
            { timeNs: 200, type: 'distractor   on' },
            { timeNs: 300, type: '   response     made   ' },
            ]

            const result = alignExperimentEventsToMarkers(events)

            expect(result.markers).toEqual<ExperimentMarker[]>([
            { timeNs: 100, type: 'TRIAL_START' },
            { timeNs: 200, type: 'DISTRACTOR_ON' },
            { timeNs: 300, type: 'RESPONSE_MADE' },
            ])
        })
    })

    describe('B — Ordering', () => {
        it('B1 — returns events sorted by ascending timeNs when sort is true or omitted', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 300, type: 'third' },
            { timeNs: 100, type: 'first' },
            { timeNs: 200, type: 'second' },
            ]

            const defaultResult = alignExperimentEventsToMarkers(events)
            const explicitSortResult = alignExperimentEventsToMarkers(events, { sort: true })

            const expected: ExperimentMarker[] = [
            { timeNs: 100, type: 'FIRST' },
            { timeNs: 200, type: 'SECOND' },
            { timeNs: 300, type: 'THIRD' },
            ]

            expect(defaultResult.markers).toEqual(expected)
            expect(explicitSortResult.markers).toEqual(expected)
        })

        it('B2 — preserves original relative order for events with the same timeNs', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 100, type: 'alpha', sourceIndex: 0 },
            { timeNs: 100, type: 'beta', sourceIndex: 1 },
            { timeNs: 50, type: 'earlier', sourceIndex: 2 },
            { timeNs: 100, type: 'gamma', sourceIndex: 3 },
            ]

            const result = alignExperimentEventsToMarkers(events)

            expect(result.markers).toEqual<ExperimentMarker[]>([
            { timeNs: 50, type: 'EARLIER' },
            { timeNs: 100, type: 'ALPHA' },
            { timeNs: 100, type: 'BETA' },
            { timeNs: 100, type: 'GAMMA' },
            ])
        })

        it('B3 — preserves input order after normalization and filtering when sort is false', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 300, type: 'third event' },
            { timeNs: 100, type: 'first event' },
            { timeNs: 200, type: 'second event' },
            ]

            const result = alignExperimentEventsToMarkers(events, { sort: false })

            expect(result.markers).toEqual<ExperimentMarker[]>([
            { timeNs: 300, type: 'THIRD_EVENT' },
            { timeNs: 100, type: 'FIRST_EVENT' },
            { timeNs: 200, type: 'SECOND_EVENT' },
            ])
        })
    })

    describe('C — Filtering and diagnostics', () => {
        it('C1 — filters events with non-finite timeNs and counts them in diagnostics.filteredReasons.invalidTimeNs', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 100, type: 'valid one' },
            { timeNs: Number.NaN, type: 'bad nan' },
            { timeNs: Number.POSITIVE_INFINITY, type: 'bad inf' },
            { timeNs: Number.NEGATIVE_INFINITY, type: 'bad neg inf' },
            { timeNs: 200, type: 'valid two' },
            ]

            const result = alignExperimentEventsToMarkers(events)

            expect(result.markers).toEqual<ExperimentMarker[]>([
            { timeNs: 100, type: 'VALID_ONE' },
            { timeNs: 200, type: 'VALID_TWO' },
            ])

            expect(result.diagnostics.filteredReasons.invalidTimeNs).toBe(3)
            expect(result.diagnostics.filteredReasons.blankType).toBe(0)
        })

        it('C2 — filters events whose type becomes blank after trimming/normalization and counts them in diagnostics.filteredReasons.blankType', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 100, type: 'valid event' },
            { timeNs: 200, type: '' },
            { timeNs: 300, type: '     ' },
            { timeNs: 400, type: '\t   \n' },
            { timeNs: 500, type: 'also valid' },
            ]

            const result = alignExperimentEventsToMarkers(events, { sort: false })

            expect(result.markers).toEqual<ExperimentMarker[]>([
            { timeNs: 100, type: 'VALID_EVENT' },
            { timeNs: 500, type: 'ALSO_VALID' },
            ])

            expect(result.diagnostics.filteredReasons.invalidTimeNs).toBe(0)
            expect(result.diagnostics.filteredReasons.blankType).toBe(3)
        })

        it('C3 — reports correct totals for totalEvents, acceptedEvents, filteredEvents, and filteredReasons', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 100, type: 'valid a' },
            { timeNs: Number.NaN, type: 'invalid time' },
            { timeNs: 200, type: '   ' },
            { timeNs: 300, type: 'valid b' },
            { timeNs: Number.POSITIVE_INFINITY, type: 'invalid time 2' },
            ]

            const result = alignExperimentEventsToMarkers(events)

            expect(result.diagnostics).toEqual({
            totalEvents: 5,
            acceptedEvents: 2,
            filteredEvents: 3,
            filteredReasons: {
                invalidTimeNs: 2,
                blankType: 1,
            },
            })
        })
    })

    describe('D — Safety and determinism', () => {
        it('D1 — does not mutate the input events array, event objects, or payload objects', () => {
            const payloadA = { trialId: 1, nested: { label: 'start' } }
            const payloadB = { trialId: 2, nested: { label: 'end' } }

            const events: RawExperimentEvent[] = [
            { timeNs: 200, type: ' trial start ', payload: payloadA, sourceIndex: 0 },
            { timeNs: 100, type: ' trial end ', payload: payloadB, sourceIndex: 1 },
            ]

            const originalArraySnapshot = events.slice()
            const originalEvent0 = { ...events[0] }
            const originalEvent1 = { ...events[1] }
            const originalType0 = events[0].type
            const originalType1 = events[1].type
            const originalPayloadARef = payloadA
            const originalPayloadBRef = payloadB

            alignExperimentEventsToMarkers(events)

            expect(events).toEqual(originalArraySnapshot)
            expect(events[0]).toEqual(originalEvent0)
            expect(events[1]).toEqual(originalEvent1)
            expect(events[0].type).toBe(originalType0)
            expect(events[1].type).toBe(originalType1)
            expect(events[0].payload).toBe(originalPayloadARef)
            expect(events[1].payload).toBe(originalPayloadBRef)
            expect(payloadA).toEqual({ trialId: 1, nested: { label: 'start' } })
            expect(payloadB).toEqual({ trialId: 2, nested: { label: 'end' } })
        })

        it('D2 — returns deep-equal results when run twice with identical inputs', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 300, type: ' trial start ', payload: { id: 3 } },
            { timeNs: 100, type: 'trial end', payload: { id: 1 } },
            { timeNs: 200, type: '   ' },
            { timeNs: Number.NaN, type: 'bad time' },
            { timeNs: 100, type: 'trial start', payload: { id: 2 } },
            ]

            const resultA = alignExperimentEventsToMarkers(events)
            const resultB = alignExperimentEventsToMarkers(events)

            expect(resultA).toEqual(resultB)
        })
    })

    describe('E — Output compatibility', () => {
        it('E1 — preserves payload contents for accepted events', () => {
            const payload1 = {
            trialId: 'T1',
            condition: 'control',
            score: 42,
            }

            const payload2 = {
            trialId: 'T2',
            distractor: true,
            meta: { level: 3 },
            }

            const events: RawExperimentEvent[] = [
            { timeNs: 100, type: 'trial start', payload: payload1 },
            { timeNs: 200, type: 'distractor on', payload: payload2 },
            ]

            const result = alignExperimentEventsToMarkers(events)

            expect(result.markers).toEqual<ExperimentMarker[]>([
            {
                timeNs: 100,
                type: 'TRIAL_START',
                payload: {
                trialId: 'T1',
                condition: 'control',
                score: 42,
                },
            },
            {
                timeNs: 200,
                type: 'DISTRACTOR_ON',
                payload: {
                trialId: 'T2',
                distractor: true,
                meta: { level: 3 },
                },
            },
            ])
        })

        it('E2 — returns markers directly usable as Step 4 ExperimentMarker[] input shape', () => {
            const events: RawExperimentEvent[] = [
            { timeNs: 500, type: 'trial start', payload: { trial: 1 } },
            { timeNs: 1500, type: 'trial end', payload: { trial: 1 } },
            ]

            const result = alignExperimentEventsToMarkers(events)

            const markers: ExperimentMarker[] = result.markers

            expect(markers).toEqual([
            { timeNs: 500, type: 'TRIAL_START', payload: { trial: 1 } },
            { timeNs: 1500, type: 'TRIAL_END', payload: { trial: 1 } },
            ])
        })
    })
})