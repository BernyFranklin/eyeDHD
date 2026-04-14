import type { Database, Statement } from 'better-sqlite3';

import type { SegmentInput, DetectionConfig } from './CaseData';

export default {
	create,
	read,
	readByName,
	list,
	iterate,
	update,
	remove,
	exists
};

/**
 * A saved, reusable configuration bundle combining event markers and detection
 * thresholds. Profiles are stored in the per-project database and can be applied
 * to any case in the same project to avoid re-entering the same marker set or
 * threshold values repeatedly.
 */
export type ConfigProfile = {
	id: number;
	name: string;
	markers: SegmentInput[];
	detection: DetectionConfig | null;
	created_at: string;
	updated_at: string;
};

export type ConfigProfileRaw = Omit<ConfigProfile, 'markers' | 'detection'> & {
	markers: string;
	detection: string | null;
};

export type ConfigProfileCreate = {
	name: string;
	markers?: SegmentInput[];
	detection?: DetectionConfig | null;
};

export type ConfigProfileUpdate = Partial<Omit<ConfigProfile, 'id' | 'created_at' | 'updated_at'>>;

function parseJsonColumn<T>(value: string | null): T | null {
	if (value === null || value === undefined) return null;
	return JSON.parse(value) as T;
}

function toJsonColumn<T>(value: T | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	return JSON.stringify(value);
}

function rawToProfile(raw: ConfigProfileRaw): ConfigProfile {
	return {
		...raw,
		markers: (parseJsonColumn<SegmentInput[]>(raw.markers) ?? []) as SegmentInput[],
		detection: parseJsonColumn<DetectionConfig>(raw.detection)
	};
}

/**
 * Creates the ConfigProfile table in the database if it does not already exist.
 * Names are unique within a project.
 */
export function createConfigProfileTable(db: Database) {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS ConfigProfile (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			markers TEXT NOT NULL DEFAULT '[]',
			detection TEXT DEFAULT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`).run();
}

/**
 * Drops the ConfigProfile table from the database. Typically used for testing
 * to reset state.
 */
export function deleteConfigProfileTable(db: Database) {
	db.prepare(`DROP TABLE IF EXISTS ConfigProfile;`).run();
}

/**
 * Creates a new ConfigProfile row. Throws if the name is already in use.
 */
function create(db: Database, input: ConfigProfileCreate): ConfigProfile {
	const name = input.name?.trim();
	if (!name) {
		throw new Error('ConfigProfile name is required');
	}

	const markersJson = toJsonColumn(input.markers ?? []) ?? '[]';
	const detectionJson = toJsonColumn(input.detection ?? null);

	const result = db.prepare(`
		INSERT INTO ConfigProfile (name, markers, detection)
		VALUES (?, ?, ?);
	`).run(name, markersJson, detectionJson);

	const row = db.prepare<[number | bigint], ConfigProfileRaw>(`
		SELECT * FROM ConfigProfile WHERE id = ?;
	`).get(result.lastInsertRowid);

	if (!row) {
		throw new Error(`Failed to create ConfigProfile: ${name}`);
	}

	return rawToProfile(row);
}

/**
 * Reads a ConfigProfile by its numeric id. Throws if not found.
 */
function read(db: Database, id: number): ConfigProfile {
	const row = db.prepare<number, ConfigProfileRaw>(`
		SELECT * FROM ConfigProfile WHERE id = ?;
	`).get(id);

	if (!row) {
		throw new Error(`ConfigProfile not found for id: ${id}`);
	}

	return rawToProfile(row);
}

/**
 * Reads a ConfigProfile by its unique name. Returns null if not found.
 */
function readByName(db: Database, name: string): ConfigProfile | null {
	const row = db.prepare<string, ConfigProfileRaw>(`
		SELECT * FROM ConfigProfile WHERE name = ?;
	`).get(name);

	return row ? rawToProfile(row) : null;
}

/**
 * Returns true if a ConfigProfile with the given name exists.
 */
function exists(db: Database, name: string): boolean {
	const row = db.prepare<string, { one: number }>(`
		SELECT 1 as one FROM ConfigProfile WHERE name = ?;
	`).get(name);

	return !!row;
}

/**
 * Returns all ConfigProfiles ordered alphabetically by name.
 */
function list(db: Database): ConfigProfile[] {
	const rows = db.prepare<[], ConfigProfileRaw>(`
		SELECT * FROM ConfigProfile ORDER BY name ASC;
	`).all();

	return rows.map(rawToProfile);
}

type ConfigProfileIterStatement = Omit<
	Statement<[], ConfigProfileRaw>,
	'iterate'
> & {
	iterate(): IterableIterator<ConfigProfile>
};

/**
 * Returns a streaming iterator over all ConfigProfiles. Parallels CaseData.iterate().
 */
function iterate(db: Database): ConfigProfileIterStatement {
	const stmt = db.prepare<[], ConfigProfileRaw>(`
		SELECT * FROM ConfigProfile ORDER BY name ASC;
	`);
	const iterateRaw = stmt.iterate.bind(stmt);

	return Object.assign(stmt, {
		iterate: function* () {
			for (const row of iterateRaw()) {
				yield rawToProfile(row);
			}
		}
	}) as ConfigProfileIterStatement;
}

/**
 * Updates a ConfigProfile in place. Only name/markers/detection can be changed.
 * Pass `detection: null` to explicitly clear the detection config.
 */
function update(
	db: Database,
	profile: ConfigProfile,
	updates: ConfigProfileUpdate
): ConfigProfile {
	const merged: ConfigProfile = {
		...profile,
		name: updates.name !== undefined ? updates.name.trim() : profile.name,
		markers: updates.markers !== undefined ? updates.markers : profile.markers,
		detection: updates.detection !== undefined ? updates.detection : profile.detection
	};

	if (!merged.name) {
		throw new Error('ConfigProfile name is required');
	}

	const payload = {
		id: profile.id,
		name: merged.name,
		markers: toJsonColumn(merged.markers) ?? '[]',
		detection: toJsonColumn(merged.detection)
	};

	const result = db.prepare(`
		UPDATE ConfigProfile
		SET
			name = @name,
			markers = @markers,
			detection = @detection,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = @id;
	`).run(payload);

	if (!result.changes) {
		throw new Error(`Failed to update ConfigProfile: ${profile.name}`);
	}

	return read(db, profile.id);
}

/**
 * Deletes a ConfigProfile by id. Returns the deleted profile.
 */
function remove(db: Database, profile: ConfigProfile): ConfigProfile {
	const original = read(db, profile.id);

	const result = db.prepare(`
		DELETE FROM ConfigProfile WHERE id = ?;
	`).run(original.id);

	if (!result.changes) {
		throw new Error(`Failed to delete ConfigProfile: ${original.name}`);
	}

	return original;
}
