type ErrorPattern = {
	match: RegExp;
	message: string;
};

const PATTERNS: ErrorPattern[] = [
	{ match: /ENOENT|no such file/i, message: 'The file or folder could not be found.' },
	{ match: /EACCES|EPERM/i, message: 'Permission denied. Please check file access.' },
	{ match: /EBUSY/i, message: 'The file is in use by another program.' },
	{
		match: /SQLITE_CONSTRAINT|UNIQUE constraint/i,
		message: 'This entry already exists.'
	},
	{
		match: /SQLITE_BUSY|database is locked/i,
		message: 'The database is busy. Please try again.'
	},
	{
		match: /invalid csv|csv.*parse|parse.*csv/i,
		message: 'The CSV file could not be read. Please check the format.'
	},
	{
		match: /object has been destroyed|channel closed|ipc/i,
		message: 'The application lost its connection. Please try again.'
	}
];

function extractMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === 'string') return err;
	if (err && typeof err === 'object' && 'message' in err) {
		const msg = (err as { message: unknown }).message;
		if (typeof msg === 'string') return msg;
	}
	return '';
}

export function toUserMessage(err: unknown, fallback: string): string {
	const raw = extractMessage(err);
	if (!raw) return fallback;

	for (const { match, message } of PATTERNS) {
		if (match.test(raw)) return message;
	}

	return fallback;
}
