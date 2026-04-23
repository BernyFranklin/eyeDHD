import { renderFigureSpec } from './renderFigureSpec';
import { FigureRenderSpec } from './types'
import type {
	PngFigureRenderBackend,
	RenderedPngArtifact,
	RenderPngFigureOptions
} from './backends/types';

export function renderPngFigure(
	spec: FigureRenderSpec,
	backend: PngFigureRenderBackend,
	options: RenderPngFigureOptions = {}
): RenderedPngArtifact {
	return renderFigureSpec(spec, backend, options);
}
