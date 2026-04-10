import { Canvas } from 'skia-canvas';

import type { PngFigureRenderBackend } from './types';

// Tick generation: computes evenly-spaced "nice" tick values for an axis.
// Uses a 1-2-5 rounding scheme so ticks land on clean numbers.
// NOTE: May need to revisit when using live study data (20+ min recordings
// with dense data). The target tick count or rounding scheme may need
// adjustment for very large or very small domains.
function computeNiceTicks(min: number, max: number, targetCount = 6): number[] {
	const range = max - min;
	if (range === 0) return [min];

	const rawStep = range / targetCount;
	const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
	const residual = rawStep / magnitude;

	let niceStep: number;
	if (residual <= 1.5) niceStep = 1 * magnitude;
	else if (residual <= 3.5) niceStep = 2 * magnitude;
	else if (residual <= 7.5) niceStep = 5 * magnitude;
	else niceStep = 10 * magnitude;

	const tickStart = Math.ceil(min / niceStep) * niceStep;
	const ticks: number[] = [];
	for (let v = tickStart; v <= max + niceStep * 0.001; v += niceStep) {
		ticks.push(Math.round(v * 1e10) / 1e10);
	}
	return ticks;
}

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

			// --- Compute plot area from margins ---
			const m = spec.margins;
			const plotLeft = m.leftPx;
			const plotTop = m.topPx;
			const plotWidth = context.widthPx - m.leftPx - m.rightPx;
			const plotHeight = context.heightPx - m.topPx - m.bottomPx;
			const plotBottom = plotTop + plotHeight;
			const plotRight = plotLeft + plotWidth;

			// --- Compute data domain ---
			let xMin = 0, xMax = 1, yMin = 0, yMax = 1;

			if (spec.geometry.type === 'histogram') {
				const bins = spec.geometry.bins;
				if (bins.length > 0) {
					xMin = Math.min(...bins.map((b) => b.binStart));
					xMax = Math.max(...bins.map((b) => b.binEnd));
					yMin = 0;
					yMax = Math.max(...bins.map((b) => b.count));
				}
			} else if (spec.geometry.type === 'scatter' || spec.geometry.type === 'line') {
				const allPts = spec.geometry.series.flatMap((s) => s.points);
				if (allPts.length > 0) {
					xMin = Math.min(...allPts.map((p) => p.x));
					xMax = Math.max(...allPts.map((p) => p.x));
					yMin = Math.min(...allPts.map((p) => p.y));
					yMax = Math.max(...allPts.map((p) => p.y));
				}
			}

			const xRange = xMax - xMin || 1;
			const yRange = yMax - yMin || 1;

			// --- Draw gridlines and ticks ---
			// NOTE: Tick spacing uses a nice-numbers algorithm targeting ~6 ticks.
			// May need adjustment for live study data (20+ min, dense points).
			const xTicks = computeNiceTicks(xMin, xMax);
			const yTicks = computeNiceTicks(yMin, yMax);

			ctx.strokeStyle = '#e0e0e0';
			ctx.lineWidth = 1;

			for (const tick of xTicks) {
				const px = plotLeft + ((tick - xMin) / xRange) * plotWidth;
				ctx.beginPath();
				ctx.moveTo(px, plotTop);
				ctx.lineTo(px, plotBottom);
				ctx.stroke();
			}

			for (const tick of yTicks) {
				const py = plotBottom - ((tick - yMin) / yRange) * plotHeight;
				ctx.beginPath();
				ctx.moveTo(plotLeft, py);
				ctx.lineTo(plotRight, py);
				ctx.stroke();
			}

			// Tick labels
			ctx.fillStyle = '#333';
			ctx.font = '11px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			for (const tick of xTicks) {
				const px = plotLeft + ((tick - xMin) / xRange) * plotWidth;
				ctx.fillText(String(tick), px, plotBottom + 6);
			}

			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';
			for (const tick of yTicks) {
				const py = plotBottom - ((tick - yMin) / yRange) * plotHeight;
				ctx.fillText(String(tick), plotLeft - 8, py);
			}

			// Plot area border
			ctx.strokeStyle = '#999';
			ctx.lineWidth = 1;
			ctx.strokeRect(plotLeft, plotTop, plotWidth, plotHeight);

			// --- Draw geometry ---
			if (spec.geometry.type === 'histogram') {
				const bins = spec.geometry.bins;
				if (bins.length > 0) {
					const countRange = yMax || 1;
					ctx.fillStyle = 'black';
					for (const bin of bins) {
						const x0 = plotLeft + ((bin.binStart - xMin) / xRange) * plotWidth;
						const x1 = plotLeft + ((bin.binEnd - xMin) / xRange) * plotWidth;
						const h = (bin.count / countRange) * plotHeight;
						ctx.fillRect(x0, plotBottom - h, Math.max(1, x1 - x0), h);
					}
				}
			} else if (spec.geometry.type === 'scatter' || spec.geometry.type === 'line') {
				const allPoints = spec.geometry.series.flatMap((s) => s.points);
				if (allPoints.length > 0) {
					const project = (p: { x: number; y: number }) => ({
						px: plotLeft + ((p.x - xMin) / xRange) * plotWidth,
						py: plotTop + plotHeight - ((p.y - yMin) / yRange) * plotHeight
					});

					if (spec.geometry.type === 'scatter') {
						ctx.fillStyle = 'black';
						for (const point of allPoints) {
							const { px, py } = project(point);
							ctx.beginPath();
							ctx.arc(px, py, 6, 0, Math.PI * 2);
							ctx.fill();
						}
					} else {
						ctx.strokeStyle = 'black';
						ctx.lineWidth = 2;
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

			if (spec.xAxis?.label?.text) {
				ctx.fillStyle = 'black';
				ctx.font = '14px sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText(spec.xAxis.label.text, context.widthPx / 2, context.heightPx - 8);
			}

			if (spec.yAxis?.label?.text) {
				ctx.save();
				ctx.fillStyle = 'black';
				ctx.font = '14px sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';
				ctx.translate(16, context.heightPx / 2);
				ctx.rotate(-Math.PI / 2);
				ctx.fillText(spec.yAxis.label.text, 0, 0);
				ctx.restore();
			}

			if (spec.overlays?.segmentBoundaries) {
				for (const boundary of spec.overlays.segmentBoundaries) {
					const px = plotLeft + ((boundary.timeMs - xMin) / xRange) * plotWidth;

					ctx.strokeStyle = 'blue';
					ctx.lineWidth = 1.5;
					ctx.setLineDash([6, 4]);
					ctx.beginPath();
					ctx.moveTo(px, plotTop);
					ctx.lineTo(px, plotBottom);
					ctx.stroke();
					ctx.setLineDash([]);

					if (boundary.label) {
						ctx.fillStyle = 'blue';
						ctx.font = '11px sans-serif';
						ctx.textAlign = 'left';
						ctx.textBaseline = 'bottom';
						ctx.fillText(boundary.label, px + 4, plotTop - 2);
					}
				}
			}

			if (spec.overlays?.markers) {
				for (const marker of spec.overlays.markers) {
					const px = plotLeft + ((marker.timeMs - xMin) / xRange) * plotWidth;

					ctx.strokeStyle = 'red';
					ctx.lineWidth = 1.5;
					ctx.setLineDash([3, 3]);
					ctx.beginPath();
					ctx.moveTo(px, plotTop);
					ctx.lineTo(px, plotBottom);
					ctx.stroke();
					ctx.setLineDash([]);

					ctx.fillStyle = 'red';
					ctx.font = '11px sans-serif';
					ctx.textAlign = 'left';
					ctx.textBaseline = 'bottom';
					ctx.fillText(marker.label, px + 4, plotTop - 14);
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
