import type {
	BuildFigureRenderSpecOptions,
	FigureOverlaySpec,
	FigureRenderSpec,
	FigureRendererBackend,
	RenderedFigureArtifact
} from './types';

export function buildScatterFigureSpec(
	model: { points: Array<{ timeMs: number; amplitudeDeg: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	void model;
	void options;
	throw new Error('Not implemented');
}

export function buildRateSeriesFigureSpec(
	model: { points: Array<{ timeMs: number; ratePerSec: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	void model;
	void options;
	throw new Error('Not implemented');
}

export function buildIsiHistogramFigureSpec(
	model: { bins: Array<{ binStartMs: number; binEndMs: number; count: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	void model;
	void options;
	throw new Error('Not implemented');
}

export function attachFigureOverlays(
	spec: FigureRenderSpec,
	overlays?: FigureOverlaySpec
): FigureRenderSpec {
	void spec;
	void overlays;
	throw new Error('Not implemented');
}

export function renderFigureSpec(
	spec: FigureRenderSpec,
	backend: FigureRendererBackend
): RenderedFigureArtifact {
	void spec;
	void backend;
	throw new Error('Not implemented');
}
