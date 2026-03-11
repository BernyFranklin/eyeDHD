import type {
    RawExperimentEvent,
    ExperimentMarker,
    AlignExperimentEventsOptions,
    AlignExperimentEventsResult,
} from "./types";

// Heavy Lifter
export function alignExperimentEventsToMarkers(
    events: RawExperimentEvent[],
    options: AlignExperimentEventsOptions = {}
): AlignExperimentEventsResult {
    // Initialize diagnostics counters
    let invalidTimeNs = 0;

    // Convert raw events to markers, normalizing the type field and keeping track of original indices for stable sorting
    const normalizedMarkers = events.flatMap((event, index) => { 
        // Filter out events with invalid timeNs (non-finite values)
        if (!Number.isFinite(event.timeNs)) {
            invalidTimeNs++;
            return[];
        }
        // Normalize the type field: trim whitespace, replace internal whitespace with underscores, and convert to uppercase
        const normalizedType = event.type
            .trim()
            .replace(/\s+/g, '_')
            .toUpperCase();
        // Create a marker object with the normalized type and original index for stable sorting
        return [
            {
                marker: {
                    timeNs: event.timeNs,
                    type: normalizedType,
                    payload: event.payload,
                } satisfies ExperimentMarker,
                originalIndex: index,
            },
        ];
    });

    // Sort markers by timeNs if sorting is enabled (default is true), using original indices to maintain stable order for events with the same timeNs
    const orderedMarkers = 
        options.sort === false
        ? normalizedMarkers
        : [...normalizedMarkers].sort((a, b) => {
            if (a.marker.timeNs !== b.marker.timeNs) {
                return a.marker.timeNs - b.marker.timeNs;
            }
            return a.originalIndex - b.originalIndex;
        });

    // Return the aligned markers and diagnostics
    return {
        markers: orderedMarkers.map(({ marker }) => marker),
        diagnostics: {
            totalEvents: events.length,
            acceptedEvents: normalizedMarkers.length,
            filteredEvents: invalidTimeNs,
            filteredReasons: {
                invalidTimeNs,
                blankType: 0,
            },
        },
    };
}