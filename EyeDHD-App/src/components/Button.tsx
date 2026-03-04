import { disableButtons, enableButtons } from '@src/data/features/global';
import { store } from '@src/data';
import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	width?: React.CSSProperties['width'];
	height?: React.CSSProperties['height'];
	padding?: React.CSSProperties['padding'];
};

export const ButtonControls = {
	disable: () => {
		store.dispatch(disableButtons());
	},
	enable: () => {
		store.dispatch(enableButtons());
	}
}

/**
 * Reusable Button component with built-in styles and support for custom class names,
 * inline styles, and disabled state. Accepts an onClick handler that can be async or
 * sync. When disabled, the button shows a distinct style and prevents interaction.
 */
export default function Button({
	className = '',
	type = 'button',
	width,
	height,
	padding,
	children,
	...rest
}: Props) {
	const combinedClassName = ['btn', className].filter(Boolean).join(' ');
	const mergedStyle: React.CSSProperties = {
		...(width !== undefined ? { width } : {}),
		...(height !== undefined ? { height } : {}),
		...(padding !== undefined ? { padding } : {})
	};

	return (
		<>
			<button
				type={type}
				className={combinedClassName}
				style={mergedStyle}
				{...rest}
			>
				{children}
			</button>
			<style>{`
				.btn {
					display: block;
					background-color: var(--action-bg);
					color: var(--action-text);
					border: none;
					padding: 1rem;
					border-radius: var(--action-radius);
					cursor: pointer;
					font-weight: 600;
					font-size: 1rem;
					transition: ease background-color 0.3s;
					margin-top: 1rem;
					width: fit-content;
				}

				.btn:hover {
					background-color: var(--action-bg-hover);
				}

				.btn:disabled {
					background-color: var(--action-bg-disabled);
					cursor: not-allowed;
				}
			`}</style>
		</>
	);
}