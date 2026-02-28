import type { Database } from 'better-sqlite3';

export default { create, read, exists, update };

export type User = {
	id: number;
	name: string;
	dir?: string;
	project_initialized?: number;
	created_at: string;
	updated_at: string;
};

const NAME = 'HOMELESS_MAN';

/**
 *
 */
export function createUserTable(db: Database) {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS user (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			dir TEXT,
			project_initialized INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`).run();
}

/**
 *
 */
export function deleteUserTable(db: Database) {
  	db.prepare(`
    	DROP TABLE IF EXISTS user;
    `)
   .run();
}

/**
 *
 */
function create(
	db: Database,
	dir?: string
): User {
  	const result = db.prepare<[string, string | null], User>(`
	   		INSERT INTO user (name, dir)
	     	VALUES (?, ?);
      	`)
    	.run(NAME, dir ?? null);

  	const user = db.prepare<[number | bigint], User>(`
	      	SELECT * FROM user WHERE id = ?;
		`)
    	.get(result.lastInsertRowid);

    if (!user) {
    	throw new Error(`Failed to create user entry for: ${dir}`);
    }

    return user;
}

function exists(db: Database): boolean {
	const user = db.prepare<string, User>(`
		SELECT * FROM user WHERE name = ?;
	`)
	.get(NAME);

	return !!user;
}

/**
 *
 */
function read(db: Database): User {
  	const user = db.prepare<string, User>(`
    	SELECT * FROM user WHERE name = ?;
	`)
    .get(NAME);

   	if (!user) {
    	throw new Error(`File entry not found for: ${NAME}`);
   	}

  return user;
}

/**
 *
 */
function update(db: Database, user: User, updates: Partial<User>): User {
	if (updates.id !== undefined || updates.name !== undefined) {
		throw new Error('Cannot update id or name fields for user');
	}

	const merged: User = {
		id: user.id,
		name: user.name,
		...user,
		...updates
	};

	const result = db.prepare(`
    	UPDATE user
		SET
			dir = @dir,
			project_initialized = @project_initialized,
			updated_at = CURRENT_TIMESTAMP
		WHERE name = @name;
		`)
    	.run(merged);

  	if (!result.changes) {
    	throw new Error(`Failed to update file entry for: ${NAME}`);
   	}

    return read(db);
}