import React, { useCallback, useEffect, useState } from 'react';

type Props = {
	message: string;
	onClose: () => void;
	classColor: string;
	isVisible?: boolean;
};

type AlertColor = 'red' | 'green';

type UseAlertOptions = {
	autoDismissMs?: number | null;
	defaultColor?: AlertColor;
};

export function useAlert(options: UseAlertOptions = {}) {
	const { autoDismissMs = 4000, defaultColor = 'green' } = options;
	const [message, setMessage] = useState('');
	const [isVisible, setIsVisible] = useState(false);
	const [classColor, setClassColor] = useState<AlertColor>(defaultColor);

	const show = useCallback((nextMessage: string, nextColor: AlertColor = defaultColor) => {
		setMessage(nextMessage);
		setClassColor(nextColor);
		setIsVisible(true);
	}, [defaultColor]);

	const hide = useCallback(() => {
		setIsVisible(false);
		setMessage('');
	}, []);

	useEffect(() => {
		if (!isVisible || autoDismissMs == null) return;

		const timeout = setTimeout(() => {
			setIsVisible(false);
			setMessage('');
		}, autoDismissMs);

		return () => clearTimeout(timeout);
	}, [autoDismissMs, isVisible, message]);

	return {
		message,
		isVisible,
		classColor,
		show,
		hide
	};
}

export default function AlertWindow({
	message,
	onClose,
	classColor,
	isVisible = true
}: Props) {
	if (!isVisible) {
		return null;
	}

	return (
		<div className={`alert-window ${classColor}`}>
			<p>{message}</p>
			<button onClick={onClose}>Close</button>
		</div>
	);
}
