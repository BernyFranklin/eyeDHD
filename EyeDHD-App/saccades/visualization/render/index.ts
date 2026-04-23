// Saccades-specific figure-spec builders. Generic render infrastructure
// (FigureRenderSpec, helpers, defaults, renderFigureSpec, renderPngFigure,
// backends) lives in @viz/render — import directly from there.
export {
	attachFigureOverlays,
	buildIsiHistogramFigureSpec,
	buildRateSeriesFigureSpec,
	buildScatterFigureSpec
} from './buildFigureRenderSpec';
