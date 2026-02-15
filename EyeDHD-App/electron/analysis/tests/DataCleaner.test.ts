import { describe, type ExpectStatic, test } from 'vitest';

import DataCleaner from '../DataCleaner';

export type Parameters = {
	expect: ExpectStatic
} & any;

// Adds a testing db with entries added to it for each test
export const dataCleanerTest = test.extend({
	csv: async ({}, use: (csv: string) => Promise<void>) => {

    // Set up test csv files to pass to DataCleaners for tests
  }
});

describe('', () => {

});