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
    // Convert raw events to markers, normalizing the type field and keeping track of original indices for stable sorting
    const normalizedMarkers = events.map((event, index) => { 
        const normalizedType = event.type
            .trim()
            .replace(/\s+/g, "_")
            .toUpperCase();

            return {
                marker: {
                    timeNs: event.timeNs,
                    type: normalizedType,
                    payload: event.payload,
                } satisfies ExperimentMarker,
            originalIndex: index,
        }
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
            acceptedEvents: events.length,
            filteredEvents: 0,
            filteredReasons: {
                invalidTimeNs: 0,
                blankType: 0,
            },
        },
    };
}