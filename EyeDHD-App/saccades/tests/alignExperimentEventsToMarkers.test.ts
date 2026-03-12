import { describe, expect, it } from 'vitest'
import { alignExperimentEventsToMarkers } from '@saccades/ingest/alignment//alignExperimentEventsToMarkers'
import type { ExperimentMarker } from '@saccades/ingest/segmentation/types'
import type { RawExperimentEvent } from '@saccades/ingest/alignment/types'

describe('Event Alignment Layer', () => {
    describe('A — Normalization', () => {
        it('A1) Converts valid raw events into ExperimentMarker objects with normalized uppercase underscore-separated types', () => {
            const events: RawExperimentEvent[] = [                  // Load typical raw events with various type formats
            { timeNs: 100, type: 'trial start' },
            { timeNs: 200, type: 'distractor on' },
            { timeNs: 300, type: 'response made' },
            ];

            const result = alignExperimentEventsToMarkers(events);  // Align events to markers

            expect(result.markers).toEqual<ExperimentMarker[]>([    // Expect normalized types in the output markers
            { timeNs: 100, type: 'TRIAL_START' },
            { timeNs: 200, type: 'DISTRACTOR_ON' },
            { timeNs: 300, type: 'RESPONSE_MADE' },
            ]);
        })

        it('A2) Normalizes leading/trailing spaces and repeated internal whitespace', () => {
            const events: RawExperimentEvent[] = [                  // Load raw events with irregular spacing in type fields
            { timeNs: 100, type: ' Trial Start ' },
            { timeNs: 200, type: 'distractor   on' },
            { timeNs: 300, type: '   response     made   ' },
            ];

            const result = alignExperimentEventsToMarkers(events);  // Align events to markers

            expect(result.markers).toEqual<ExperimentMarker[]>([    // Expect normalized types with spaces handled correctly
            { timeNs: 100, type: 'TRIAL_START' },
            { timeNs: 200, type: 'DISTRACTOR_ON' },
            { timeNs: 300, type: 'RESPONSE_MADE' },
            ]);
        })
    })

    describe('B — Ordering', () => {
        it('B1) Returns events sorted by ascending timeNs when sort is true or omitted', () => {
            const events: RawExperimentEvent[] = [                                              // Load raw events in non-chronological order
            { timeNs: 300, type: 'third' },
            { timeNs: 100, type: 'first' },
            { timeNs: 200, type: 'second' },
            ];

            const defaultResult = alignExperimentEventsToMarkers(events);                       // Align events with default sorting (should sort by timeNs)
            const explicitSortResult = alignExperimentEventsToMarkers(events, { sort: true });  // Align events with explicit sorting enabled

            const expected: ExperimentMarker[] = [                                              // Define expected output markers sorted by timeNs with normalized types
            { timeNs: 100, type: 'FIRST' },
            { timeNs: 200, type: 'SECOND' },
            { timeNs: 300, type: 'THIRD' },
            ];

            expect(defaultResult.markers).toEqual(expected);                                    // Expect default sorting to produce the expected order
            expect(explicitSortResult.markers).toEqual(expected);                               // Expect explicit sorting to produce the same expected order
        })

        it('B2) — Preserves original relative order for events with the same timeNs', () => {
            const events: RawExperimentEvent[] = [                  // Load raw events with duplicate timeNs values to test stable sorting
            { timeNs: 100, type: 'alpha', sourceIndex: 0 },
            { timeNs: 100, type: 'beta', sourceIndex: 1 },
            { timeNs: 50, type: 'earlier', sourceIndex: 2 },
            { timeNs: 100, type: 'gamma', sourceIndex: 3 },
            ];

            const result = alignExperimentEventsToMarkers(events);  // Align events with default sorting (should sort by timeNs but maintain original order for ties)

            expect(result.markers).toEqual<ExperimentMarker[]>([    // Expect events with the same timeNs to maintain their original order as defined by sourceIndex
            { timeNs: 50, type: 'EARLIER' },
            { timeNs: 100, type: 'ALPHA' },
            { timeNs: 100, type: 'BETA' },
            { timeNs: 100, type: 'GAMMA' },
            ])
        })

        it('B3) — Preserves input order after normalization and filtering when sort is false', () => {
            const events: RawExperimentEvent[] = [                                   // Load raw events in non-chronological order to test input order preservation
            { timeNs: 300, type: 'third event' },
            { timeNs: 100, type: 'first event' },
            { timeNs: 200, type: 'second event' },
            ];

            const result = alignExperimentEventsToMarkers(events, { sort: false });  // Align events with sorting disabled (should preserve input order regardless of timeNs)

            expect(result.markers).toEqual<ExperimentMarker[]>([                     // Expect output markers to be in the same order as input events after normalization, ignoring timeNs sorting
            { timeNs: 300, type: 'THIRD_EVENT' },
            { timeNs: 100, type: 'FIRST_EVENT' },
            { timeNs: 200, type: 'SECOND_EVENT' },
            ])
        })
    })

    describe('C — Filtering and diagnostics', () => {
        it('C1) — Filters events with non-finite timeNs and counts them in diagnostics.filteredReasons.invalidTimeNs', () => {
            const events: RawExperimentEvent[] = [                             // Load raw events with a mix of valid and invalid timeNs values to test filtering and diagnostics
            { timeNs: 100, type: 'valid one' },
            { timeNs: Number.NaN, type: 'bad nan' },
            { timeNs: Number.POSITIVE_INFINITY, type: 'bad inf' },
            { timeNs: Number.NEGATIVE_INFINITY, type: 'bad neg inf' },
            { timeNs: 200, type: 'valid two' },
            ];

            const result = alignExperimentEventsToMarkers(events);             // Align events with default sorting 

            expect(result.markers).toEqual<ExperimentMarker[]>([               // Expect only the valid events with finite timeNs to be included in the output markers
            { timeNs: 100, type: 'VALID_ONE' },
            { timeNs: 200, type: 'VALID_TWO' },
            ]);

            expect(result.diagnostics.filteredReasons.invalidTimeNs).toBe(3);  // Expect diagnostics to report the correct count of events filtered due to invalid timeNs values
            expect(result.diagnostics.filteredReasons.blankType).toBe(0);      // Expect diagnostics to report zero events filtered due to blank types in this test case
        })

        it('C2) — Filters events whose type becomes blank after trimming/normalization and counts them in diagnostics.filteredReasons.blankType', () => {
            const events: RawExperimentEvent[] = [                                  // Load raw events with type fields that will become blank after trimming and normalization
            { timeNs: 100, type: 'valid event' },
            { timeNs: 200, type: '' },
            { timeNs: 300, type: '     ' },
            { timeNs: 400, type: '\t   \n' },
            { timeNs: 500, type: 'also valid' },
            ];

            const result = alignExperimentEventsToMarkers(events, { sort: false })  // Align events with sorting disabled to focus on filtering and diagnostics

            expect(result.markers).toEqual<ExperimentMarker[]>([                    // Expect only the events with non-blank types
            { timeNs: 100, type: 'VALID_EVENT' },
            { timeNs: 500, type: 'ALSO_VALID' },
            ]);

            expect(result.diagnostics.filteredReasons.invalidTimeNs).toBe(0);       // Expect diagnostics to report zero events filtered
            expect(result.diagnostics.filteredReasons.blankType).toBe(3);           // Expect diagnostics to report the correct count of events filtered 
        })

        it('C3) — Reports correct totals for totalEvents, acceptedEvents, filteredEvents, and filteredReasons', () => {
            const events: RawExperimentEvent[] = [                  // Load raw events with a mix of valid and invalid timeNs values and type fields
            { timeNs: 100, type: 'valid a' },
            { timeNs: Number.NaN, type: 'invalid time' },
            { timeNs: 200, type: '   ' },
            { timeNs: 300, type: 'valid b' },
            { timeNs: Number.POSITIVE_INFINITY, type: 'invalid time 2' },
            ];

            const result = alignExperimentEventsToMarkers(events);  // Align events with default sorting to test overall diagnostics reporting

            expect(result.diagnostics).toEqual({                    // Expect diagnostics to report the correct totals for total events, accepted events, filtered events, and reasons for filtering
            totalEvents: 5,
            acceptedEvents: 2,
            filteredEvents: 3,
            filteredReasons: {
                invalidTimeNs: 2,
                blankType: 1,
            },
            });
        })
    })

    describe('D — Safety and determinism', () => {
        it('D1) — Does not mutate the input events array, event objects, or payload objects', () => {
            const payloadA = { trialId: 1, nested: { label: 'start' } };           // Load raw events with payload objects to test immutability of input data structures
            const payloadB = { trialId: 2, nested: { label: 'end' } };  

            const events: RawExperimentEvent[] = [                                 // Define raw events with payloads and various type formats, including leading/trailing spaces
            { timeNs: 200, type: ' trial start ', payload: payloadA, sourceIndex: 0 },
            { timeNs: 100, type: ' trial end ', payload: payloadB, sourceIndex: 1 },
            ];

            const originalArraySnapshot = events.slice();                          // Take a shallow snapshot of the original events array to compare against after alignment
            const originalEvent0 = { ...events[0] };                               // Take a shallow copy of the first event object to compare against after alignment
            const originalEvent1 = { ...events[1] };                               // Take a shallow copy of the second event object to compare against after alignment
            const originalType0 = events[0].type;                                  // Store the original type string of the first event to verify it remains unchanged after alignment
            const originalType1 = events[1].type;                                  // Store the original type string of the second event to verify it remains unchanged after alignment
            const originalPayloadARef = payloadA;                                  // Store the original reference to payloadA to verify it remains unchanged after alignment
            const originalPayloadBRef = payloadB;                                  // Store the original reference to payloadB to verify it remains unchanged after alignment

            alignExperimentEventsToMarkers(events);                                // Align events to markers, which should not mutate the input events array or its contents

            expect(events).toEqual(originalArraySnapshot);                         // Expect the events array to be unchanged (same length and same event objects in the same order)
            expect(events[0]).toEqual(originalEvent0);                             // Expect the first event object to be unchanged (same timeNs, type, payload reference, and sourceIndex)
            expect(events[1]).toEqual(originalEvent1);                             // Expect the second event object to be unchanged (same timeNs, type, payload reference, and sourceIndex)
            expect(events[0].type).toBe(originalType0);                            // Expect the type string of the first event to be unchanged (including spaces)
            expect(events[1].type).toBe(originalType1);                            // Expect the type string of the second event to be unchanged (including spaces)
            expect(events[0].payload).toBe(originalPayloadARef);                   // Expect the payload reference of the first event to be unchanged (same object in memory)
            expect(events[1].payload).toBe(originalPayloadBRef);                   // Expect the payload reference of the second event to be unchanged (same object in memory)
            expect(payloadA).toEqual({ trialId: 1, nested: { label: 'start' } });  // Expect the contents of payloadA to be unchanged after alignment
            expect(payloadB).toEqual({ trialId: 2, nested: { label: 'end' } });    // Expect the contents of payloadB to be unchanged after alignment
        })

        it('D2) — Returns deep-equal results when run twice with identical inputs', () => {
            const events: RawExperimentEvent[] = [                   // Define raw events with payloads and various type formats, including leading/trailing spaces
            { timeNs: 300, type: ' trial start ', payload: { id: 3 } },
            { timeNs: 100, type: 'trial end', payload: { id: 1 } },
            { timeNs: 200, type: '   ' },
            { timeNs: Number.NaN, type: 'bad time' },
            { timeNs: 100, type: 'trial start', payload: { id: 2 } },
            ];

            const resultA = alignExperimentEventsToMarkers(events);  // Align events to markers for the first time to get the initial result
            const resultB = alignExperimentEventsToMarkers(events);  // Align events to markers for the second time to verify consistency

            expect(resultA).toEqual(resultB);                        // Expect the results of both alignments to be deeply equal
        })
    })

    describe('E — Output compatibility', () => {
        it('E1) — Preserves payload contents for accepted events', () => {
            const payload1 = {                                      // Load raw events with complex payload objects to test that payload contents are preserved in the output markers
            trialId: 'T1',
            condition: 'control',
            score: 42,
            };

            const payload2 = {                                      // Load another raw event with a different complex payload object to test that payload contents are preserved in the output markers
            trialId: 'T2',
            distractor: true,
            meta: { level: 3 },
            };

            const events: RawExperimentEvent[] = [                  //Load events with payloads
            { timeNs: 100, type: 'trial start', payload: payload1 },
            { timeNs: 200, type: 'distractor on', payload: payload2 },
            ];

            const result = alignExperimentEventsToMarkers(events);  // Align events to markers

            expect(result.markers).toEqual<ExperimentMarker[]>([    // Expect the output markers to include the payloads with their contents preserved, while also normalizing the type fields
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
            ]);
        })

        it('E2) — Returns markers directly usable as Step 4 ExperimentMarker[] input shape', () => {
            const events: RawExperimentEvent[] = [                        // Load raw events that represent typical experiment events with valid timeNs and type fields
            { timeNs: 500, type: 'trial start', payload: { trial: 1 } },
            { timeNs: 1500, type: 'trial end', payload: { trial: 1 } },
            ];

            const result = alignExperimentEventsToMarkers(events);        // Align events to markers, which should produce an array of ExperimentMarker objects 

            const markers: ExperimentMarker[] = result.markers;           // The output markers should be directly usable as input for Step 4 segmentation

            expect(markers).toEqual([                                     // Expect the output markers to have the correct timeNs, normalized type fields, 
            { timeNs: 500, type: 'TRIAL_START', payload: { trial: 1 } },  // and preserved payloads, making them directly usable for segmentation
            { timeNs: 1500, type: 'TRIAL_END', payload: { trial: 1 } },
            ]);
        })
    })
})