import React, { useCallback, useEffect, useRef, useState } from "react";

import AnimationWindow from "./animation/AnimationWindow";
import RemoteStream from "../data/RemoteStream";
import { type CaseData } from "../types";

type Props = {
	file: CaseData;
	csvStream: RemoteStream;
	setCsvStream: React.Dispatch<React.SetStateAction<RemoteStream | null>>;
};

const SUPPORTED_MIME_TYPES = [
	'video/mp4; codecs=avc1',
	'video/mp4',
	'video/webm; codecs=h264',
	'video/webm'
];

const CAPTURE_FPS = 30;
const RENDER_RESOLUTION = {
	width: 1920,
	height: 1080
};

/**
 * Records the canvas output from the AnimationWindow and prompts the user to save the
 * file once complete. Captures the canvas at RENDER_RESOLUTION at CAPTURE_FPS
 */
export default function CanvasRecorder(props: Props) {
	const [finished, setFinished] = useState(false);
	const [isRecording, setIsRecording] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	const startRecording = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		canvas.width = RENDER_RESOLUTION.width;
		canvas.height = RENDER_RESOLUTION.height;

		const mimeType = SUPPORTED_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));

		const stream = canvas.captureStream(CAPTURE_FPS);
		const recorder = new MediaRecorder(stream, { mimeType });

		chunksRef.current = [];

		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				chunksRef.current.push(event.data);
			}
		}

		recorder.onstop = () => {
			const blob = new Blob(chunksRef.current, { type: mimeType })

			const name = props.file.name;

			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;

			// Generate filename based on name and mimeType used
			anchor.download = `${name}.${mimeType.split('/')[1].split(';')[0]}`;

			anchor.click();
			URL.revokeObjectURL(url);
		}

		recorder.start();
		mediaRecorderRef.current = recorder;
		setIsRecording(true);
	}, []);

	useEffect(() => {
		if (finished) {
			mediaRecorderRef.current?.stop();
			setIsRecording(false);
			props.setCsvStream(null);
		}

		startRecording();
	}, [finished])

	return (
		<>
			<AnimationWindow
				ref={canvasRef}
				csvStream={props.csvStream}
				isRecording={isRecording}
				finished={finished}
				setFinished={setFinished}
			/>
		</>
	);
}