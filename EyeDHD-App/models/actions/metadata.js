export default { create, read, readAll, update, remove };

function create(db, filename, filepath, request_size) {
  try {
    const result = db
      .prepare(`
  			INSERT INTO metadata (name, path, request_size)
  			VALUES (?, ?, ?);
  		`)
      .run(filename, filepath, request_size);

    const file = db
      .prepare(`
        SELECT * FROM metadata WHERE id = ?;
			`)
      .get(result.lastInsertRowid);

    if (!file) {
      throw new Error(`Failed to create file entry for: ${filename}`);
    }

    return file;
  } catch (err) {
    console.error(err);

    return null;
  }
}

function read(db, filename) {
  try {
    const file = db
      .prepare(`
        SELECT * FROM metadata WHERE name = ?;
			`)
      .get(filename);

    if (!file) {
      return null;
    }

    return file;
  } catch (err) {
    console.error(err);

    return null;
  }
}

function readAll(db) {
  try {
    const files = db
      .prepare(`
        SELECT * FROM metadata;
			`)
      .all();

    return files;
  } catch (err) {
    console.error(err);

    return null;
  }
}

function update(db, file) {
  try {
    const result = db
      .prepare(`
        UPDATE metadata
			  SET
					request_size = @request_size,
					header = @header,
				  completed = @completed,
				  cleaned = @cleaned,
				  requested = @requested,
				  first_frame = @first_frame,
				  last_frame = @last_frame,
				  updated_at = CURRENT_TIMESTAMP
				WHERE id = @id;
			`)
      .run(file);

    if (!result.changes) {
      throw new Error(`Failed to update file entry for: ${file.name}`);
    }

    return true;
  } catch (err) {
    console.error(err);

    return false;
  }
}

function remove(db, file) {
  try {
    const original = read(db, file.name);

    const result = db
      .prepare(`
        DELETE FROM metadata
			  WHERE id = ?
			`)
      .run(original.id);

    if (!result.changes) {
      throw new Error(`Failed to delete file entry for: ${file.name}`);
    }

    return original;
  } catch (err) {
    console.error(err);

    return null;
  }
}
