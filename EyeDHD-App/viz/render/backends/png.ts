import { Canvas } from 'skia-canvas';

import { DEFAULT_TICK_LABEL_FONT_SIZE_PT, DEFAULT_FONT_FAMILY } from '../defaults';
import type { FontSpec } from '../types';
import type { PngFigureRenderBackend } from './types';

/** Convert a pt-based FontSpec to a canvas font string, using dpi to scale. */
function fontString(font: FontSpec | undefined, dpi: number, fallback: string): string {
	if (!font) return fallback;
	const px = Math.round((font.sizePt / 72) * dpi);
	const weight = font.weight ?? 'normal';
	const family = font.family || 'sans-serif';
	return `${weight} ${px}px ${family}`;
}

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

/**
 * Colorblind-friendly palette used to distinguish series in line charts.
 * Sourced from Okabe-Ito — safe for common types of color-vision deficiency
 * and prints well in grayscale.
 */
const SERIES_PALETTE = [
	'#000000', // black
	'#E69F00', // orange
	'#56B4E9', // sky blue
	'#009E73', // bluish green
	'#CC79A7', // reddish purple
	'#D55E00', // vermillion
	'#0072B2', // blue
	'#F0E442', // yellow
] as const;

/** Well-known series ids get a stable color regardless of ordering. */
const SERIES_COLOR_BY_ID: Record<string, string> = {
	// Pupil: left/right/mean distinguished; SE bands share the mean color as
	// lighter companions (deliberately muted so they don't dominate).
	'pupil-left-diameter': '#E69F00',
	'pupil-right-diameter': '#56B4E9',
	'pupil-mean-diameter': '#000000',
	'pupil-left-percent-change': '#E69F00',
	'pupil-right-percent-change': '#56B4E9',
	'pupil-percent-change': '#000000',
	'pupil-erp-mean': '#000000',
	'pupil-erp-upper-se': '#888888',
	'pupil-erp-lower-se': '#888888',
};

function pickSeriesColor(seriesId: string, index: number): string {
	return (
		SERIES_COLOR_BY_ID[seriesId] ??
		SERIES_PALETTE[index % SERIES_PALETTE.length]
	);
}

export function createSkiaCanvasPngBackend(): PngFigureRenderBackend {
	return {
		kind: 'skia-canvas-png',
		supportedFormats: ['png'],
		renderFigure(spec, context) {
			// GPU rendering is enabled by default in skia-canvas@3 but can
			// intermittently fail PNG encoding when batching many figures in
			// sequence (Electron main process, no GPU context). Force CPU
			// rendering for deterministic batch output.
			const canvas = new Canvas(context.widthPx, context.heightPx, { gpu: false });
			const ctx = canvas.getContext('2d');

			if (context.background === 'white') {
				ctx.fillStyle = 'white';
				ctx.fillRect(0, 0, context.widthPx, context.heightPx);
			}

			if (spec.title?.text) {
				ctx.fillStyle = 'black';
				ctx.font = fontString(spec.title.font, context.dpi, '28px sans-serif');
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
			// NOTE: avoid `Math.min(...arr)` / spread on large series — V8's call
			// stack blows up around ~125k args, which 5+ minutes of per-frame
			// pupil data easily exceeds.
			let xMin = 0, xMax = 1, yMin = 0, yMax = 1;

			if (spec.geometry.type === 'histogram') {
				const bins = spec.geometry.bins;
				if (bins.length > 0) {
					xMin = bins[0].binStart;
					xMax = bins[0].binEnd;
					yMin = 0;
					yMax = bins[0].count;
					for (let i = 1; i < bins.length; i++) {
						const b = bins[i];
						if (b.binStart < xMin) xMin = b.binStart;
						if (b.binEnd > xMax) xMax = b.binEnd;
						if (b.count > yMax) yMax = b.count;
					}
				}
			} else if (spec.geometry.type === 'scatter' || spec.geometry.type === 'line') {
				let initialized = false;
				for (const series of spec.geometry.series) {
					for (const p of series.points) {
						if (!initialized) {
							xMin = xMax = p.x;
							yMin = yMax = p.y;
							initialized = true;
							continue;
						}
						if (p.x < xMin) xMin = p.x;
						else if (p.x > xMax) xMax = p.x;
						if (p.y < yMin) yMin = p.y;
						else if (p.y > yMax) yMax = p.y;
					}
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
			ctx.font = fontString(
				{ sizePt: DEFAULT_TICK_LABEL_FONT_SIZE_PT, family: DEFAULT_FONT_FAMILY },
				context.dpi,
				'18px sans-serif',
			);
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
				const projectX = (x: number) => plotLeft + ((x - xMin) / xRange) * plotWidth;
				const projectY = (y: number) =>
					plotTop + plotHeight - ((y - yMin) / yRange) * plotHeight;

				if (spec.geometry.type === 'scatter') {
					ctx.fillStyle = 'black';
					for (const series of spec.geometry.series) {
						for (const point of series.points) {
							ctx.beginPath();
							ctx.arc(projectX(point.x), projectY(point.y), 6, 0, Math.PI * 2);
							ctx.fill();
						}
					}
				} else {
					ctx.lineWidth = 2;
					for (let s = 0; s < spec.geometry.series.length; s++) {
						const series = spec.geometry.series[s];
						if (series.points.length === 0) continue;
						ctx.strokeStyle = pickSeriesColor(series.seriesId, s);
						ctx.beginPath();
						for (let i = 0; i < series.points.length; i++) {
							const p = series.points[i];
							const px = projectX(p.x);
							const py = projectY(p.y);
							if (i === 0) ctx.moveTo(px, py);
							else ctx.lineTo(px, py);
						}
						ctx.stroke();
					}
				}
			}

			if (spec.xAxis?.label?.text) {
				ctx.fillStyle = 'black';
				ctx.font = fontString(spec.xAxis.label.font, context.dpi, '24px sans-serif');
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText(spec.xAxis.label.text, context.widthPx / 2, context.heightPx - 8);
			}

			if (spec.yAxis?.label?.text) {
				ctx.save();
				ctx.fillStyle = 'black';
				ctx.font = fontString(spec.yAxis.label.font, context.dpi, '24px sans-serif');
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
						ctx.save();
						ctx.translate(px, plotTop - 4);
						ctx.rotate(-Math.PI / 2);
						ctx.textAlign = 'left';
						ctx.textBaseline = 'middle';
						ctx.fillText(boundary.label, 0, 0);
						ctx.restore();
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
					ctx.save();
					ctx.translate(px, plotTop - 4);
					ctx.rotate(-Math.PI / 2);
					ctx.textAlign = 'left';
					ctx.textBaseline = 'middle';
					ctx.fillText(marker.label, 0, 0);
					ctx.restore();
				}
			}

			let buffer: Buffer;
			try {
				buffer = canvas.toBufferSync('png');
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err);
				throw new Error(
					`PNG encode failed for figure "${spec.figureId}" (${context.widthPx}×${context.heightPx}@${context.dpi}): ${reason}`
				);
			}

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
