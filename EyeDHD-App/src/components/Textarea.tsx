import React from 'react';

export type TextareaStatus = 'waiting' | 'success' | 'error';
export type TextareaVariant =
	| 'default'
	| 'compact-clickable'
	| 'compact-static'
	| 'tall-clickable'
	| 'tall-static';

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
	status?: TextareaStatus;
	variant?: TextareaVariant;
	disabled?: boolean;
};

/**
 * Reusable Textarea component with built-in styles for different variants and statuses.
 * Variants control size and interactivity, while statuses show visual feedback (e.g.
 * waiting, success, error).
 * Disabled state applies a distinct style and prevents interaction.
 */
export default function Textarea({
	status,
	variant = 'default',
	disabled = false,
	className = '',
	...props
}: Props) {
	const variantClass = variant === 'default' ? '' : `text-area-${variant}`;

	const classes = [
			'text-area',
			variantClass,
			status ? `text-area-${status}` : '',
			disabled ? 'text-area-disabled' : '',
			className
		]
		.filter(Boolean)
		.join(' ');

	return (
		<>
			<textarea {...props} className={classes} />
			<style>
				{`
					.text-area {
						background: #F0F0F0;
						color: black;
						width: 100%;
						min-height: 44px;
						padding: 10px;
						border-radius: var(--action-radius);
						resize: none;
						align-self: stretch;
						margin: 0;
						box-sizing: border-box;
						font-size: 14px;
					}

					.text-area:focus,
					.text-area:focus-visible {
						outline: none;
						box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
					}

					.text-area-compact-clickable {
						height: 44px;
						cursor: pointer;
					}

					.text-area-compact-static {
						height: 44px;
						cursor: default;
						pointer-events: none;
					}

					.text-area-tall-clickable {
						min-height: 80px;
						cursor: pointer;
					}

					.text-area-tall-static {
						min-height: 80px;
						cursor: default;
						pointer-events: none;
					}

					.text-area-disabled {
						background: #F0F0F0;
						color: #A0A0A0;
						border: 1px solid #D0D0D0;
						box-shadow: none;
						cursor: not-allowed;
						pointer-events: none;
					}

					.text-area-waiting {
						border: 1px solid #7A7A7A;
						animation: text-area-waiting-pulse 1.4s ease-in-out infinite;
						box-shadow: 0 0 0 1px color-mix(
							in srgb,
							var(--action-bg) 45%,
							transparent
						);
					}

					.text-area-success {
						border: 2px solid #00A000;
					}

					.text-area-error {
						border: 2px solid #B1102B;
					}

					@keyframes text-area-waiting-pulse {
						0% {
							box-shadow: 0 0 0 1px color-mix(
								in srgb,
								var(--action-bg) 45%,
								transparent
							);
						}
						50% {
							box-shadow: 0 0 0 2px color-mix(
								in srgb,
								var(--action-bg) 90%,
								transparent
							);
						}
						100% {
							box-shadow: 0 0 0 1px color-mix(
								in srgb,
								var(--action-bg) 45%,
								transparent
							);
						}
					}
				`}
			</style>
		</>
	);
}