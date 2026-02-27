import type { Database } from 'better-sqlite3';

export default { create, read, update };

export type User = {
	id: number;
	name: string;
	dir?: string;
};

const NAME = 'USER';

/**
 *
 */
export function createUserTable(db: Database) {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS user (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			dir TEXT,
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
  	const result = db.prepare<[string | null], User>(`
	   		INSERT INTO user (name, dir)
	     	VALUES (${NAME}, ?);
      	`)
    	.run(dir);

   	const user = db.prepare<[number | bigint], User>(`
	      	SELECT * FROM metadata WHERE id = ?;
		`)
    	.get(result.lastInsertRowid);

    if (!user) {
    	throw new Error(`Failed to create user entry for: ${dir}`);
    }

    return user;
}

/**
 *
 */
function read(db: Database): User {
  	const user = db.prepare<string, User>(`
    	SELECT * FROM metadata WHERE name = ?;
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
			updated_at = CURRENT_TIMESTAMP
		WHERE id = @id;
		`)
    .run(merged);

  	if (!result.changes) {
    	throw new Error(`Failed to update file entry for: ${NAME}`);
   	}

    return read(db);
}