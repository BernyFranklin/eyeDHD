export const DEFAULT_DIMENSIONS = {
	widthPx: 2400,
	heightPx: 1800,
	dpi: 300
} as const;

export const DEFAULT_MARGINS = {
	topPx: 240,
	rightPx: 80,
	bottomPx: 160,
	leftPx: 200
} as const;

export const DEFAULT_STYLE = {
	background: 'white',
	grid: {
		show: true
	},
	legend: {
		show: false,
		position: 'none'
	}
} as const;

export const DEFAULT_FONT_FAMILY = 'Arial';
export const DEFAULT_TITLE_FONT_SIZE_PT = 22;
export const DEFAULT_AXIS_LABEL_FONT_SIZE_PT = 16;
export const DEFAULT_TICK_LABEL_FONT_SIZE_PT = 8;
