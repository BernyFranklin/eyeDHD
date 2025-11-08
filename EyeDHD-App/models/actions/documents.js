import { filesMap } from "../../electron/store";

export default { create, open, save, remove };

function create(db, filename, filepath, bufferSize) {

    const cleaner = new DataCleaner({
        path: filepath,
        buf_len: bufferSize
    });

    filesMap.set(filename, cleaner);

    return { ok: true, document: undefined };
}

function read(db, filename) {
    return { ok: false, document: undefined };
}

function update(db, filename, ...rest) {
    return { ok: true, document: undefined };
}

function remove(db, filename) {
	return { ok: true, document: undefined };
}