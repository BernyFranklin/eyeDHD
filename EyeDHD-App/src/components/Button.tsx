import { disableButtons, enableButtons } from '@src/data/features/global';
import { useDispatch } from '@src/data/hooks';
import React from 'react';

type Props = {
	onClick?: (() => Promise<void>) | (() => void) | ((e: Event) => void);
	className?: string;
	title?: string;
	style?: React.CSSProperties;
	children: React.ReactNode;
	disabled?: boolean;
	type?: 'submit' | 'reset' | 'button' | undefined;
	width?: React.CSSProperties['width'];
	height?: React.CSSProperties['height'];
	padding?: React.CSSProperties['padding'];
};

export const ButtonControls = {
	disable: () => {
		const dispatch = useDispatch();
		dispatch(disableButtons());
	},
	enable: () => {
		const dispatch = useDispatch();
		dispatch(enableButtons());
	}
}

export default function Button({
	onClick,
	className = '',
	title,
	style,
	children,
	disabled = false,
	type = 'button',
	width,
	height,
	padding
}: Props) {
	const combinedClassName = ['btn', className].filter(Boolean).join(' ');
	const mergedStyle: React.CSSProperties = {
		...style,
		...(width !== undefined ? { width } : {}),
		...(height !== undefined ? { height } : {}),
		...(padding !== undefined ? { padding } : {})
	};

	return (
		<>
			<button
				type={type}
				className={combinedClassName}
				title={title}
				style={mergedStyle}
				onClick={onClick as () => void}
				disabled={disabled}
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