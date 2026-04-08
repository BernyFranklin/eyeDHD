import type {
    BuildFigureRenderSpecOptions,
    FigureOverlaySpec,
    FigureRenderSpec
} from './types';

import {
    DEFAULT_AXIS_LABEL_FONT_SIZE_PT,
    DEFAULT_DIMENSIONS,
    DEFAULT_FONT_FAMILY,
    DEFAULT_MARGINS,
    DEFAULT_STYLE,
    DEFAULT_TITLE_FONT_SIZE_PT
} from './defaults';

interface BuildBaseFigureSpecArgs {
    figureId: string;
    kind: FigureRenderSpec['kind'];
    options: BuildFigureRenderSpecOptions;
    defaultXAxisLabel: string;
    defaultYAxisLabel: string;
    title?: FigureRenderSpec['title'];
    xAxis?: Partial<FigureRenderSpec['xAxis']>;
    yAxis?: Partial<FigureRenderSpec['yAxis']>;
    geometry: FigureRenderSpec['geometry'];
}

export function resolveDimensions(options: BuildFigureRenderSpecOptions): {
	widthPx: number;
	heightPx: number;
	dpi: number;
} {
	return {
		widthPx:
			options.dimensions?.widthPx ??
			options.publicationDefaults?.dimensions?.widthPx ??
			DEFAULT_DIMENSIONS.widthPx,
		heightPx:
			options.dimensions?.heightPx ??
			options.publicationDefaults?.dimensions?.heightPx ??
			DEFAULT_DIMENSIONS.heightPx,
		dpi:
			options.dimensions?.dpi ??
			options.publicationDefaults?.dimensions?.dpi ??
			DEFAULT_DIMENSIONS.dpi
	};
}

export function resolveFontFamily(options: BuildFigureRenderSpecOptions): string {
	return options.publicationDefaults?.fontFamily ?? DEFAULT_FONT_FAMILY;
}

export function cloneOverlays(overlays?: FigureOverlaySpec): FigureOverlaySpec | undefined {
    if (!overlays) {
        return undefined;
    }

    return {
        markers: overlays.markers ? [...overlays.markers] : undefined,
        segmentBoundaries: overlays.segmentBoundaries
            ? [...overlays.segmentBoundaries]
            : undefined
    };
}

export function buildTitleSpec(
    title: string | undefined,
    fontFamily: string
): FigureRenderSpec['title'] {
    if (!title) {
        return undefined;
    }

    return {
        text: title,
        font: {
            family: fontFamily,
            sizePt: DEFAULT_TITLE_FONT_SIZE_PT,
            weight: 'bold'
        }
    };
}

export function buildAxisLabelSpec(
    text: string,
    fontFamily: string
): FigureRenderSpec['xAxis']['label'] {
    return {
        text,
        font: {
            family: fontFamily,
            sizePt: DEFAULT_AXIS_LABEL_FONT_SIZE_PT
        }
    };
}

export function buildBaseFigureSpec({
	figureId,
	kind,
	options,
	defaultXAxisLabel,
	defaultYAxisLabel,
	title,
	xAxis,
	yAxis,
	geometry
}: BuildBaseFigureSpecArgs): FigureRenderSpec {
	return {
		figureId,
		kind,
		dimensions: resolveDimensions(options),
		margins: DEFAULT_MARGINS,
		title,
		xAxis: {
			label: xAxis?.label ?? {
				text: options.xAxisLabel ?? defaultXAxisLabel
			},
			scaleType: xAxis?.scaleType ?? 'linear',
			domain: xAxis?.domain
		},
		yAxis: {
			label: yAxis?.label ?? {
				text: options.yAxisLabel ?? defaultYAxisLabel
			},
			scaleType: yAxis?.scaleType ?? 'linear',
			domain: yAxis?.domain
		},
		geometry,
		style: DEFAULT_STYLE,
		overlays: cloneOverlays(options.overlays),
		metadata: options.metadata
	};
}
