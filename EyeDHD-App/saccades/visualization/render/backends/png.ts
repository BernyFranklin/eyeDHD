import { Canvas } from 'skia-canvas';

import type { PngFigureRenderBackend } from './types';

export function createSkiaCanvasPngBackend(): PngFigureRenderBackend {
	return {
		kind: 'skia-canvas-png',
		supportedFormats: ['png'],
		renderFigure(spec, context) {
			const canvas = new Canvas(context.widthPx, context.heightPx);
			const ctx = canvas.getContext('2d');

			if (context.background === 'white') {
				ctx.fillStyle = 'white';
				ctx.fillRect(0, 0, context.widthPx, context.heightPx);
			}

			if (spec.title?.text) {
				ctx.fillStyle = 'black';
				ctx.font = '16px sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';
				ctx.fillText(spec.title.text, context.widthPx / 2, 8);
			}

			if (spec.geometry.type === 'histogram') {
				const bins = spec.geometry.bins;
				if (bins.length > 0) {
					const xMin = Math.min(...bins.map((b) => b.binStart));
					const xMax = Math.max(...bins.map((b) => b.binEnd));
					const countMax = Math.max(...bins.map((b) => b.count));
					const xRange = xMax - xMin || 1;
					const countRange = countMax || 1;
					ctx.fillStyle = 'black';
					for (const bin of bins) {
						const x0 = ((bin.binStart - xMin) / xRange) * (context.widthPx - 1);
						const x1 = ((bin.binEnd - xMin) / xRange) * (context.widthPx - 1);
						const h = (bin.count / countRange) * (context.heightPx - 1);
						ctx.fillRect(x0, context.heightPx - 1 - h, Math.max(1, x1 - x0), h);
					}
				}
			} else if (spec.geometry.type === 'scatter' || spec.geometry.type === 'line') {
				const allPoints = spec.geometry.series.flatMap((s) => s.points);
				if (allPoints.length > 0) {
					const xs = allPoints.map((p) => p.x);
					const ys = allPoints.map((p) => p.y);
					const xMin = Math.min(...xs);
					const xMax = Math.max(...xs);
					const yMin = Math.min(...ys);
					const yMax = Math.max(...ys);
					const xRange = xMax - xMin || 1;
					const yRange = yMax - yMin || 1;
					const project = (p: { x: number; y: number }) => ({
						px: ((p.x - xMin) / xRange) * (context.widthPx - 1),
						py:
							context.heightPx - 1 - ((p.y - yMin) / yRange) * (context.heightPx - 1)
					});

					if (spec.geometry.type === 'scatter') {
						ctx.fillStyle = 'black';
						for (const point of allPoints) {
							const { px, py } = project(point);
							ctx.beginPath();
							ctx.arc(px, py, 3, 0, Math.PI * 2);
							ctx.fill();
						}
					} else {
						ctx.strokeStyle = 'black';
						ctx.lineWidth = 1;
						for (const series of spec.geometry.series) {
							if (series.points.length === 0) continue;
							ctx.beginPath();
							series.points.forEach((point, index) => {
								const { px, py } = project(point);
								if (index === 0) ctx.moveTo(px, py);
								else ctx.lineTo(px, py);
							});
							ctx.stroke();
						}
					}
				}
			}

			if (spec.overlays?.segmentBoundaries) {
				ctx.fillStyle = 'blue';
				ctx.font = '10px sans-serif';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				for (const boundary of spec.overlays.segmentBoundaries) {
					ctx.fillText(`boundary:${boundary.label ?? ''}@${boundary.timeMs}`, 4, 40);
				}
			}

			if (spec.overlays?.markers) {
				ctx.fillStyle = 'red';
				ctx.font = '10px sans-serif';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				for (const marker of spec.overlays.markers) {
					ctx.fillText(`${marker.kind}:${marker.label}@${marker.timeMs}`, 4, 24);
				}
			}

			const buffer = canvas.toBufferSync('png');

			return {
				figureId: spec.figureId,
				format: 'png',
				mimeType: 'image/png',
				widthPx: context.widthPx,
				heightPx: context.heightPx,
				dpi: context.dpi,
				data: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
			};
		}
	};
}

export function createDeterministicPngBackend(): PngFigureRenderBackend {
	return {
		kind: 'deterministic-png',
		supportedFormats: ['png'],
		renderFigure(spec, context) {
			return {
				figureId: spec.figureId,
				format: 'png',
				mimeType: 'image/png',
				widthPx: context.widthPx,
				heightPx: context.heightPx,
				dpi: context.dpi,
				// Wrap TextEncoder output in a fresh Uint8Array so it's bound to the
				// current realm's constructor — jsdom's globals use a different
				// Uint8Array than Node's, and `instanceof Uint8Array` (e.g. vitest's
				// toBeInstanceOf) returns false on the unwrapped result.
				data: new Uint8Array(
					new TextEncoder().encode(
						`${context.widthPx}|${context.dpi}|${context.background}|${JSON.stringify(spec.overlays ?? null)}|${spec.title?.text ?? ''}`
					)
				)
			};
		}
	};
}
