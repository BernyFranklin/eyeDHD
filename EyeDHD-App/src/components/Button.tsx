import React from 'react';

import { store } from '@src/data';
import { useSelector } from '@src/data/hooks';
import { disableButtons, enableButtons, selectButtons } from '@src/data/features/global';

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
	const global = useSelector(selectButtons);

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
				disabled={global.disabled || rest.disabled}
				{...rest}
			>
				{children}
			</button>
			<style>
				{`
					.btn {
						display: flex;
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
						justify-content: center;
						align-items: center;
					}

					.btn > svg {
						width: auto;
						height: auto;
						flex-shrink: 0;
						display: block;
					}

					.btn:hover {
						background-color: var(--action-bg-hover);
					}

					.btn:disabled {
						background-color: var(--action-bg-disabled);
						cursor: not-allowed;
					}
				`}
			</style>
		</>
	);
}