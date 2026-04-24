import type {
	FigureRenderBackend,
	FigureRenderBackendContext,
	RenderedArtifactBase,
	RenderFigureSpecOptions
} from './backends/types';

import { FigureRenderSpec } from './types'

const DEFAULT_RENDER_DPI = 300;
const DEFAULT_RENDER_BACKGROUND = 'white';

export function renderFigureSpec<TArtifact extends RenderedArtifactBase>(
	spec: FigureRenderSpec,
	backend: FigureRenderBackend<TArtifact>,
	options: RenderFigureSpecOptions = {}
): TArtifact {
	validateBackendSupportsPng(backend);

	const context: FigureRenderBackendContext = {
		widthPx: spec.dimensions.widthPx,
		heightPx: spec.dimensions.heightPx,
		dpi: options.dpi ?? DEFAULT_RENDER_DPI,
		background: options.background ?? DEFAULT_RENDER_BACKGROUND
	};

	const artifact = backend.renderFigure(spec, context);

	validateArtifactMatchesContext(artifact, context);

	return artifact;
}

function validateBackendSupportsPng(
	backend: FigureRenderBackend<RenderedArtifactBase>
): void {
	if (!backend.supportedFormats.includes('png')) {
		throw new Error(
			`Render backend "${backend.kind}" does not support required render format: png`
		);
	}
}

function validateArtifactMatchesContext(
	artifact: RenderedArtifactBase,
	context: FigureRenderBackendContext
): void {
	if (
		artifact.widthPx !== context.widthPx ||
		artifact.heightPx !== context.heightPx ||
		artifact.dpi !== context.dpi
	) {
		throw new Error('Inconsistent rendered artifact metadata returned by backend');
	}
}
