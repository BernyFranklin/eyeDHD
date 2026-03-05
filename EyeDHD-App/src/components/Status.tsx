import React from 'react';
import { Check, Ellipsis, X } from 'lucide-react';

type ResultState = 'pending' | 'error' | 'success';

type Props = React.HTMLAttributes<HTMLDivElement> & {
	state: ResultState;
	padding?: React.CSSProperties['padding'];
};

const SIZE = 30;
const WIDTH = 3;

const ICONS: Record<ResultState, React.ReactElement> = {
	pending: <Ellipsis size={SIZE} strokeWidth={WIDTH} />,
	error: <X size={SIZE} strokeWidth={WIDTH} />,
	success: <Check size={SIZE} strokeWidth={WIDTH} />
};

/**
 * Reusable component for displaying a status icon based on a given state. The
 * state can be 'pending', 'error', or 'success', which will determine the
 * icon and color displayed.
 *
 * The component also accepts an optional padding prop to adjust spacing around the icon.
 */
export default function Status({
	state,
	padding,
	...rest
}: Props) {
	const combinedClassName = [
			'result',
			`result--${state}`
		]
		.filter(Boolean)
		.join(' ');

	const mergedStyle: React.CSSProperties = {
		...(padding !== undefined ? { padding } : {}),
	};

	return (
		<>
			<div
				className={combinedClassName}
				style={mergedStyle}
				{...rest}
			>
				{ICONS[state]}
			</div>
			<style>
				{`
					.result {
						display: inline-flex;
						align-items: center;
						justify-content: center;
						width: ${SIZE}px;
						height: ${SIZE}px;
						box-sizing: border-box;
						user-select: none;
					}

					.result--pending {
						color: #9ca3af;
					}

					.result--error {
						color: #ef4444;
					}

					.result--success {
						color: #22c55e;
					}
				`}
			</style>
		</>
	);
}