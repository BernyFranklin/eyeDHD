export function inRange(value: number, min: number, max: number): boolean {
    return Number.isFinite(value) && value >= min && value <= max;
}

// Small helper to increment Partial<Record<...>> without forcing zero keys into object
export function incPartialCount<K extends string>(
    map: Partial<Record<K, number>>,
    key: K
) {
    map[key] = (map[key] ?? 0) + 1;                         // Increment count for this key, initializing to 0 if it doesn't exist
}