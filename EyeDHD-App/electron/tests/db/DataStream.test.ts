import { describe, it, expect, vi } from 'vitest';
import DataStream, { type DataType } from '../../db/DataStream';
import DatabaseManager from '../../db/DatabaseManager';

type Batch = DataType[];

function makeBatchIterator(batches: Batch[]) {
	let index = 0;
	return {
		async next(): Promise<IteratorResult<Batch>> {
			if (index >= batches.length) {
				return { done: true, value: undefined as unknown as Batch };
			}
			const value = batches[index];
			index += 1;
			return { done: false, value };
		}
	} as AsyncIterator<Batch>;
}

describe('Database - DataStream', () => {
	describe('A) Batched Streams', () => {
		it('A1) Increments progress rows by batch size', async () => {
   			const batches: Batch[] = [
      			[null, null],
         		[null]
      		];
      		const manager = {} as unknown as DatabaseManager;
	       	const stream = DataStream.testStream(
				'CSVData',
				makeBatchIterator(batches)
			);

	        const first = await stream.next(manager);
	        expect(first.done).toBe(false);
	        expect(first.value).toHaveLength(2);
	        expect(stream.progress.rows).toBe(2);
	        expect(stream.progress.done).toBe(false);

	        const second = await stream.next(manager);
	        expect(second.done).toBe(false);
	        expect(second.value).toHaveLength(1);
	        expect(stream.progress.rows).toBe(3);
	        expect(stream.progress.done).toBe(false);

	        const third = await stream.next(manager);
	        expect(third.done).toBe(true);
	        expect(stream.progress.done).toBe(true);
		});
	});
});