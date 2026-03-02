import React, { useEffect } from 'react';

import Button from './Button';

import { useDispatch, useSelector } from '@src/data/hooks';
import { selectAlert, hideAlert } from '@src/data/features/global';

const AUTO_DISMISS_MS = 4000;

/**
 * AlertWindow component that displays an alert message with a close button.
 * It uses the alert context to determine visibility, message, and color.
 * The alert will auto-dismiss after a set duration or can be closed manually.
 *
 * The AlertWindow is a global component rendered once in App.tsx that can be triggered
 * from anywhere in the app by dispatching the showAlert action with the appropriate
 * message and color. It listens to changes in the alert state and displays accordingly.
 */
export default function AlertWindow() {
	const dispatch = useDispatch();
	const alert = useSelector(selectAlert);

	useEffect(() => {
		if (!alert.isVisible) return;

		const timeout = setTimeout(() => {
			dispatch(hideAlert());
		}, AUTO_DISMISS_MS);

		return () => clearTimeout(timeout);
	}, [alert.isVisible, alert.key, dispatch]);

	if (!alert.isVisible) {
		return null;
	}

	return (
		<div
			key={alert.key}
			className={`alert-window ${alert.color}`}
			onAnimationEnd={() => dispatch(hideAlert())}
		>
			<p>{alert.message}</p>
			<Button onClick={() => dispatch(hideAlert())}>Close</Button>
			<style>{`
				.alert-window {
					margin-top: 0;
					padding: 1rem;
					border: 1px solid;
					border-radius: 4px;
					position: fixed;
					top: 12px;
					right: 12px;
					z-index: 10000;
					pointer-events: auto;
					animation: fadeInOut 4s ease-in-out forwards;
				}

				.alert-window.green {
					background-color: #d4edda;
					color: #155724;
					border-color: 1px solid #c3e6cb;
				}

				.alert-window.red {
					background-color: #f8d7da;
					color: #721c24;
					border-color: 1px solid #f5c6cb;
				}

				@keyframes fadeInOut {
					0% {
						opacity: 0;
					}
					10% {
						opacity: 1;
					}
					90% {
						opacity: 1;
					}
					100% {
						opacity: 0;
					}
				}
			`}</style>
		</div>
	);
}
