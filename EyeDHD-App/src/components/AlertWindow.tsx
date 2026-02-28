import React, { useEffect } from 'react';

import { useDispatch, useSelector } from '../store/hooks';
import { selectAlert, hideAlert } from '../store/features/global';

const AUTO_DISMISS_MS = 4000;

/**
 * AlertWindow component that displays an alert message with a close button.
 * It uses the alert context to determine visibility, message, and color.
 * The alert will auto-dismiss after a set duration or can be closed manually.
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
			<button onClick={() => dispatch(hideAlert())}>Close</button>
		</div>
	);
}
