export type FigureKind = 'scatter' | 'rate-series' | 'histogram' | 'composite' | 'custom';

export type AxisScaleType = 'linear' | 'log';

export type LegendPosition = 'top' | 'right' | 'bottom' | 'left' | 'none';

export type HorizontalAlignment = 'left' | 'center' | 'right';

export interface FigureDimensions {
	widthPx: number;
	heightPx: number;
	dpi: number;
}

export interface FigureMargins {
	topPx: number;
	rightPx: number;
	bottomPx: number;
	leftPx: number;
}

export interface FontSpec {
	family: string;
	sizePt: number;
	weight?: 'normal' | 'bold';
}

export interface TitleSpec {
	text: string;
	align?: HorizontalAlignment;
	font?: FontSpec;
}

export interface AxisLabelSpec {
	text: string;
	font?: FontSpec;
}

export interface NumericRange {
	min: number;
	max: number;
}

export interface AxisSpec {
	label: AxisLabelSpec;
	scaleType: AxisScaleType;
	domain?: NumericRange;
	includeZero?: boolean;
}

export interface GridSpec {
	show: boolean;
}

export interface LegendSpec {
	show: boolean;
	position: LegendPosition;
}

export interface MarkerOverlaySpec {
	timeMs: number;
	label: string;
	kind: string;
}

export interface SegmentBoundaryOverlaySpec {
	timeMs: number;
	label?: string;
}

export interface FigureOverlaySpec {
	markers?: MarkerOverlaySpec[];
	segmentBoundaries?: SegmentBoundaryOverlaySpec[];
}

export interface ScatterSeriesPoint {
	x: number;
	y: number;
}

export interface LineSeriesPoint {
	x: number;
	y: number;
}

export interface ScatterSeriesSpec {
	seriesId: string;
	points: ScatterSeriesPoint[];
}

export interface LineSeriesBandSpec {
	upperPoints: LineSeriesPoint[];
	lowerPoints: LineSeriesPoint[];
}

export interface LineSeriesSpec {
	seriesId: string;
	points: LineSeriesPoint[];
	band?: LineSeriesBandSpec;
}

export interface HistogramBinSpec {
	binStart: number;
	binEnd: number;
	count: number;
}

export interface ScatterGeometrySpec {
	type: 'scatter';
	series: ScatterSeriesSpec[];
}

export interface RateSeriesGeometrySpec {
	type: 'line';
	series: LineSeriesSpec[];
}

export interface HistogramGeometrySpec {
	type: 'histogram';
	bins: HistogramBinSpec[];
}

export type FigureGeometrySpec =
	| ScatterGeometrySpec
	| RateSeriesGeometrySpec
	| HistogramGeometrySpec;

export interface FigureStyleSpec {
	background: 'white' | 'transparent';
	grid: GridSpec;
	legend: LegendSpec;
}

export interface FigureRenderSpec {
	figureId: string;
	kind: FigureKind;
	dimensions: FigureDimensions;
	margins: FigureMargins;
	title?: TitleSpec;
	xAxis: AxisSpec;
	yAxis: AxisSpec;
	geometry: FigureGeometrySpec;
	overlays?: FigureOverlaySpec;
	style: FigureStyleSpec;
	metadata?: Record<string, unknown>;
}

export interface PublicationFigureDefaults {
	dimensions: FigureDimensions;
	margins: FigureMargins;
	fontFamily: string;
	baseFontSizePt: number;
	titleFontSizePt: number;
	axisLabelFontSizePt: number;
	background: 'white' | 'transparent';
	includeGrid: boolean;
	includeZeroX?: boolean;
	includeZeroY?: boolean;
}

export interface BuildFigureRenderSpecOptions {
	figureId?: string;
	title?: string;
	xAxisLabel?: string;
	yAxisLabel?: string;
	dimensions?: Partial<FigureDimensions>;
	margins?: Partial<FigureMargins>;
	legend?: Partial<LegendSpec>;
	axisDomains?: {
		x?: NumericRange;
		y?: NumericRange;
	};
	overlays?: FigureOverlaySpec;
	publicationDefaults?: Partial<PublicationFigureDefaults>;
	metadata?: Record<string, unknown>;
}

export interface RenderedFigureArtifact {
	figureId: string;
	format: 'png';
	widthPx: number;
	heightPx: number;
	dpi: number;
	bytes: Uint8Array;
	metadata?: Record<string, unknown>;
}

export interface FigureRendererBackend {
	render(spec: FigureRenderSpec): RenderedFigureArtifact;
}
