import type { PngFigureRenderBackend } from './types';

export function createDeterministicPngBackend(): PngFigureRenderBackend {
	return {
		kind: 'deterministic-png',
		supportedFormats: ['png'],
		renderFigure() {
			throw new Error('createDeterministicPngBackend: not implemented');
		}
	};
}
