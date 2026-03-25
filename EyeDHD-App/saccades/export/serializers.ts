// TO-DO: Implement these stubs. They are currently just placeholders to allow the rest of the code to compile without errors.

export function serializeCsvRows(rows: Record<string, unknown>[]): string {
	if (rows.length === 0) {
		return '';
	}

	const columns = Object.keys(rows[0]).sort();

	const header = columns.join(',');

	const dataLines = rows.map((row) =>
		columns.map((column) => String(row[column] ?? '')).join(',')
	);

	return [header, ...dataLines].join('\n');
}

export function serializeJsonValue(value: unknown): string {
	void value;
	return '';
}
