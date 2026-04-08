import type { PngFigureRenderBackend } from './types';

export function createDeterministicPngBackend(): PngFigureRenderBackend {
	return {
		kind: 'deterministic-png',
		supportedFormats: ['png'],
		renderFigure(_spec, context) {
			return {
				format: 'png',
				mimeType: 'image/png',
				widthPx: context.widthPx,
				heightPx: context.heightPx,
				dpi: context.dpi,
				// Wrap TextEncoder output in a fresh Uint8Array so it's bound to the
				// current realm's constructor — jsdom's globals use a different
				// Uint8Array than Node's, and `instanceof Uint8Array` (e.g. vitest's
				// toBeInstanceOf) returns false on the unwrapped result.
				data: new Uint8Array(new TextEncoder().encode(String(context.widthPx)))
			};
		}
	};
}
