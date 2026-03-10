export interface RawExperimentEvent {
    timeNs: number
    type: string
    payload?: Record<string, unknown>
    sourceIndex?: number
}

export interface ExperimentMarker {
    timeNs: number
    type: string
    payload?: Record<string, unknown>
}

export interface AlignExperimentEventsOptions {
  sort?: boolean
}

export interface AlignExperimentEventsDiagnostics {
    totalEvents: number
    acceptedEvents: number
    filteredEvents: number
    filteredReasons: {
    invalidTimeNs: number
    blankType: number
    }
}

export interface AlignExperimentEventsResult {
    markers: ExperimentMarker[]
    diagnostics: AlignExperimentEventsDiagnostics
}