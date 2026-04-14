export const DEFAULT_DIMENSIONS = {
    widthPx: 2400,
    heightPx: 1800,
    dpi: 300
} as const;

export const DEFAULT_MARGINS = {
    topPx: 96,
    rightPx: 72,
    bottomPx: 96,
    leftPx: 120
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
export const DEFAULT_TITLE_FONT_SIZE_PT = 28;
export const DEFAULT_AXIS_LABEL_FONT_SIZE_PT = 24;