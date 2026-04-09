import { FigureRenderSpec } from '@saccades/visualization/render'

export type RenderTargetFormat = 'png';

export type RenderBackground = 'white' | 'transparent';

export interface RenderExecutionOptions {
	dpi?: number;
	background?: RenderBackground;
}

export interface FigureRenderBackendContext {
	widthPx: number;
	heightPx: number;
	dpi: number;
	background: RenderBackground;
}

export interface RenderedArtifactBase {
	figureId: string;
	format: RenderTargetFormat;
	mimeType: string;
	widthPx: number;
	heightPx: number;
	dpi: number;
}

export interface RenderedPngArtifact extends RenderedArtifactBase {
	format: 'png';
	mimeType: 'image/png';
	data: Uint8Array;
}

export interface FigureRenderBackend<
	TArtifact extends RenderedArtifactBase = RenderedArtifactBase
> {
	kind: string;
	supportedFormats: RenderTargetFormat[];
	renderFigure(spec: FigureRenderSpec, context: FigureRenderBackendContext): TArtifact;
}

export interface PngFigureRenderBackend extends FigureRenderBackend<RenderedPngArtifact> {
	supportedFormats: ['png'] | RenderTargetFormat[];
}

export type RenderFigureSpecOptions = RenderExecutionOptions;

export type RenderPngFigureOptions = RenderExecutionOptions;
