import { describe, it, expect } from 'vitest';
import { type Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import configProfileActions, {
	createConfigProfileTable,
	type ConfigProfile,
} from '../../../db/tables/ConfigProfile';
import type { SegmentInput, DetectionConfig } from '../../../db/tables/CaseData';

type SeededDb = {
	db: Database;
	cleanup: () => void;
};

function seedProfileDb(): SeededDb {
	const db = getDB({ temporary: true, logging: false });
	createConfigProfileTable(db);

	configProfileActions.create(db, {
		name: 'Baseline',
		markers: [{ id: 'event-1', startMs: 0, endMs: 1000 }],
		detection: { velocityThresholdDegPerSec: 100 },
	});

	configProfileActions.create(db, {
		name: 'Extended',
		markers: [
			{ id: 'event-1', startMs: 0, endMs: 2000 },
			{ id: 'event-2', startMs: 5000, endMs: 7000 },
		],
		detection: {
			velocityThresholdDegPerSec: 120,
			minDurationMs: 15,
			amplitudeBounds: { min: 1, max: 30 },
		},
	});

	return { db, cleanup: () => db.close() };
}

describe('Database - ConfigProfile', () => {
	describe('A) Table setup', () => {
		it('A1) Creates the ConfigProfile table', () => {
			const db = getDB({ temporary: true, logging: false });
			createConfigProfileTable(db);

			const result = db
				.prepare(
					`SELECT name FROM sqlite_master WHERE type='table' AND name='ConfigProfile';`
				)
				.get();

			expect(result).toStrictEqual({ name: 'ConfigProfile' });
			db.close();
		});
	});

	describe('B) CRUD operations', () => {
		it('B1) Creates a ConfigProfile and round-trips JSON columns', () => {
			const { db, cleanup } = seedProfileDb();

			const markers: SegmentInput[] = [
				{ id: 'event-1', startMs: 100, endMs: 500 },
			];
			const detection: DetectionConfig = {
				velocityThresholdDegPerSec: 90,
				minDurationMs: 12,
				amplitudeBounds: { min: 2, max: 25 },
			};

			const created = configProfileActions.create(db, {
				name: 'Profile A',
				markers,
				detection,
			});

			expect(created.id).toBeGreaterThan(0);
			expect(created.name).toBe('Profile A');
			expect(created.markers).toEqual(markers);
			expect(created.detection).toEqual(detection);
			expect(typeof created.created_at).toBe('string');
			expect(typeof created.updated_at).toBe('string');

			cleanup();
		});

		it('B2) Reads a ConfigProfile by id and by name', () => {
			const { db, cleanup } = seedProfileDb();

			const byName = configProfileActions.readByName(db, 'Baseline');
			expect(byName).not.toBeNull();
			expect(byName!.name).toBe('Baseline');
			expect(byName!.markers).toHaveLength(1);

			const byId = configProfileActions.read(db, byName!.id);
			expect(byId.id).toBe(byName!.id);
			expect(byId.name).toBe('Baseline');

			cleanup();
		});

		it('B3) readByName returns null for missing profiles', () => {
			const { db, cleanup } = seedProfileDb();

			const missing = configProfileActions.readByName(db, 'Nonexistent');
			expect(missing).toBeNull();

			cleanup();
		});

		it('B4) List returns profiles sorted alphabetically', () => {
			const { db, cleanup } = seedProfileDb();

			const all = configProfileActions.list(db);
			expect(all.map((p) => p.name)).toEqual(['Baseline', 'Extended']);

			cleanup();
		});

		it('B5) Updates a ConfigProfile (markers, detection, rename)', () => {
			const { db, cleanup } = seedProfileDb();

			const original = configProfileActions.readByName(db, 'Baseline')!;
			const newMarkers: SegmentInput[] = [
				{ id: 'event-1', startMs: 0, endMs: 500 },
				{ id: 'event-2', startMs: 1000, endMs: 1500 },
			];

			const updated = configProfileActions.update(db, original, {
				name: 'Baseline v2',
				markers: newMarkers,
				detection: { velocityThresholdDegPerSec: 150 },
			});

			expect(updated.id).toBe(original.id);
			expect(updated.name).toBe('Baseline v2');
			expect(updated.markers).toEqual(newMarkers);
			expect(updated.detection).toEqual({ velocityThresholdDegPerSec: 150 });

			// Re-reading confirms persistence
			const reread = configProfileActions.read(db, original.id);
			expect(reread).toEqual(updated);

			cleanup();
		});

		it('B6) Updates can clear detection by passing null', () => {
			const { db, cleanup } = seedProfileDb();

			const original = configProfileActions.readByName(db, 'Extended')!;
			expect(original.detection).not.toBeNull();

			const updated = configProfileActions.update(db, original, {
				detection: null,
			});

			expect(updated.detection).toBeNull();
			cleanup();
		});

		it('B7) Removes a ConfigProfile', () => {
			const { db, cleanup } = seedProfileDb();

			const toDelete = configProfileActions.readByName(db, 'Extended')!;
			const removed = configProfileActions.remove(db, toDelete);

			expect(removed.id).toBe(toDelete.id);
			expect(() => configProfileActions.read(db, toDelete.id)).toThrow();
			expect(configProfileActions.readByName(db, 'Extended')).toBeNull();

			cleanup();
		});
	});

	describe('C) Constraints', () => {
		it('C1) Rejects duplicate names on create', () => {
			const { db, cleanup } = seedProfileDb();

			expect(() =>
				configProfileActions.create(db, {
					name: 'Baseline',
					markers: [],
				})
			).toThrow();

			cleanup();
		});

		it('C2) Rejects empty names on create', () => {
			const { db, cleanup } = seedProfileDb();

			expect(() =>
				configProfileActions.create(db, { name: '   ', markers: [] })
			).toThrow(/name is required/i);
			expect(() =>
				configProfileActions.create(db, { name: '', markers: [] })
			).toThrow(/name is required/i);

			cleanup();
		});

		it('C3) exists() returns true/false correctly', () => {
			const { db, cleanup } = seedProfileDb();

			expect(configProfileActions.exists(db, 'Baseline')).toBe(true);
			expect(configProfileActions.exists(db, 'Nope')).toBe(false);

			cleanup();
		});
	});

	describe('D) Defaults', () => {
		it('D1) Creates a profile with empty markers and null detection when omitted', () => {
			const db = getDB({ temporary: true, logging: false });
			createConfigProfileTable(db);

			const created = configProfileActions.create(db, { name: 'Empty' });
			expect(created.markers).toEqual([]);
			expect(created.detection).toBeNull();

			const reread = configProfileActions.read(db, created.id);
			expect(reread.markers).toEqual([]);
			expect(reread.detection).toBeNull();

			db.close();
		});
	});
});
