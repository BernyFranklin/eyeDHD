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
    // Convert raw events to markers, normalizing the type field
    const markers: ExperimentMarker[] = events.map((event) => { 
        const normalizedType = event.type
            .trim()
            .replace(/\s+/g, "_")
            .toUpperCase();

            return {
                timeNs: event.timeNs,
                type: normalizedType,
                payload: event.payload,
            };
    });

    // Sort markers by timeNs if sorting is enabled (default is true)
    const outputMarkers = 
        options.sort === false
        ? markers
        : [...markers].sort((a, b) => a.timeNs - b.timeNs);

    // Return the aligned markers and diagnostics
    return {
        markers: outputMarkers,
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