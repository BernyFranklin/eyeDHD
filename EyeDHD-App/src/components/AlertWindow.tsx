import React, { useEffect, useState } from 'react';

type AlertColor = 'red' | 'green';

export interface AlertContext {
	message: string;
	isVisible: boolean;
	classColor: AlertColor;
	hide: () => void;
	show: (color: AlertColor, message: string) => void;
}

type Props = {
	alert: AlertContext;
};

const AUTO_DISMISS_MS = 4000;
const DEFAULT_COLOR = 'green';

/**
 * Custom hook to manage alert state and behavior.
 * Provides message, visibility, color, and show/hide functions.
 */
export function useAlert() {
	const [message, setMessage] = useState('');
	const [isVisible, setIsVisible] = useState(false);
	const [classColor, setClassColor] = useState<AlertColor>(DEFAULT_COLOR);

	const show = (
		nextColor: AlertColor = DEFAULT_COLOR,
		nextMessage: string
	) => {
		setMessage(nextMessage);
		setClassColor(nextColor);
		setIsVisible(true);
	};

	const hide = () => {
		setIsVisible(false);
		setMessage('');
	};

	useEffect(() => {
		if (!isVisible) return;

		const timeout = setTimeout(() => {
			setIsVisible(false);
			setMessage('');
		}, AUTO_DISMISS_MS);

		return () => clearTimeout(timeout);
	}, [isVisible, message]);

	return {
		message,
		isVisible,
		classColor,
		show,
		hide
	};
}

/**
 * AlertWindow component that displays an alert message with a close button.
 * It uses the alert context to determine visibility, message, and color.
 * The alert will auto-dismiss after a set duration or can be closed manually.
 */
export default function AlertWindow({ alert }: Props) {
	if (!alert.isVisible) {
		return null;
	}

	return (
		<div className={`alert-window ${alert.classColor}`}>
			<p>{alert.message}</p>
			<button onClick={alert.hide}>Close</button>
		</div>
	);
}
