import { describe, it, expect, vi } from 'vitest';
import DataStream from '../../db/DataStream';
import type { DataType } from '../../db/DatabaseManager';

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

function makeBatchIteratorWithReturn(batches: Batch[]) {
  const iterator = makeBatchIterator(batches) as AsyncIterator<Batch> & {
    return?: () => Promise<IteratorResult<Batch>>;
  };
  iterator.return = vi.fn(async () => ({ done: true, value: undefined as unknown as Batch }));
  return iterator;
}

describe('Database - DataStream', () => {
	describe('A) Batched Streams', () => {
		it('1) Increments progress rows by batch size', async () => {
	    const batches: Batch[] = [
	      [null, null],
	      [null]
	    ];
	    const stream = new DataStream('CSVData', makeBatchIterator(batches));

	    const first = await stream.next();
	    expect(first.done).toBe(false);
	    expect(first.value).toHaveLength(2);
	    expect(stream.progress.rows).toBe(2);
	    expect(stream.progress.done).toBe(false);

	    const second = await stream.next();
	    expect(second.done).toBe(false);
	    expect(second.value).toHaveLength(1);
	    expect(stream.progress.rows).toBe(3);
	    expect(stream.progress.done).toBe(false);

	    const third = await stream.next();
	    expect(third.done).toBe(true);
	    expect(stream.progress.done).toBe(true);
	  });

	  it('2) Treats undefined batch as empty without crashing', async () => {
	    const iterator = {
	      async next(): Promise<IteratorResult<Batch>> {
	        return { done: false, value: undefined };
	      }
	    } as AsyncIterator<Batch>;

	    const stream = new DataStream('Metadata', iterator);

	    const result = await stream.next();
	    expect(result.done).toBe(false);
	    expect(Array.isArray(result.value)).toBe(true);
	    expect(result.value.length).toBe(0);
	    expect(stream.progress.rows).toBe(0);
	  });

	  it('3) Calls iterator.return() on close()', async () => {
	    const batches: Batch[] = [];
	    const iterator = makeBatchIteratorWithReturn(batches);

	    const stream = new DataStream('CSVData', iterator);
	    await stream.next(); // consume one batch
	    stream.close();

	    expect(iterator.return).toHaveBeenCalledTimes(1);
	    expect(stream.progress.done).toBe(true);
	  });
	});
});