import React, { useCallback, useEffect, useRef, useState } from "react";

import { AnimationWindow } from "./animation/AnimationWindow";
import RemoteStream from "../data/RemoteStream";

type Props = {
	csvStream: RemoteStream;
};

const SUPPORTED_MIME_TYPES = [
	'video/mp4; codecs=avc1',
	'video/mp4',
	'video/webm; codecs=h264',
	'video/webm'
];

const FPS = 30;

export default function CanvasRecorder(props: Props) {
	const [finished, setFinished] = useState(false);
	const [isRecording, setIsRecording] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	const startRecording = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const mimeType = SUPPORTED_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));

		const stream = canvas.captureStream(FPS);
		const recorder = new MediaRecorder(stream, { mimeType });

		chunksRef.current = [];

		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				chunksRef.current.push(event.data);
			}
		}

		recorder.onstop = () => {
			const blob = new Blob(chunksRef.current, { type: mimeType })

			const name = "TODO";

			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `${name}.mp4`;

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