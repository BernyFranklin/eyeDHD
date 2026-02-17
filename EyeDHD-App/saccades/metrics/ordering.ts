// Stable sort by startTime, then endTime, then original index to maintain input order for ties
export function stableChronoSort<T extends { startTime: number; endTime: number }>(items: T[]): T[] {
    return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
        if (a.item.startTime !== b.item.startTime) return a.item.startTime - b.item.startTime;  // Primary sort by startTime
        if (a.item.endTime !== b.item.endTime) return a.item.endTime - b.item.endTime;          // Secondary sort by endTime
        return a.i - b.i;                                                                       // Maintain original order for stable sort
    })
    .map(x => x.item);
}