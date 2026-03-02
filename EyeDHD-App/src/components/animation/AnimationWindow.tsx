// React and Three.js imports
import { Canvas } from '@react-three/fiber';
import React, {
	Suspense,
	forwardRef,
	useEffect,
	useState,
	type SetStateAction,
	type Dispatch
} from 'react';
import { Environment, OrthographicCamera } from '@react-three/drei';

// Component to render and rotate the 3D eye model
import RotatingModel from './ModelMovement';

import { type CSVData } from '@src/data/types';
import RemoteStream from '@src/data/RemoteStream';

type Props = {
	csvStream: RemoteStream;
	isRecording: boolean;
	finished: boolean;
	setFinished: Dispatch<SetStateAction<boolean>>;
};

// Main animation window component
const AnimationWindow = forwardRef<HTMLCanvasElement, Props>(({
	csvStream,
	isRecording,
	finished,
	setFinished
}: Props, ref) => {
	const [csvData, setCSVData] = useState<CSVData | null>(null);

	useEffect(() => {
		// If not playing or no data, skip
		if (!isRecording || finished) return;

		// Playback speed settings
		const targetFps = 200; // Desired playback frequency in Hz

		// Add interval to update current index; For timing
		const interval = setInterval(() => {
			csvStream.next().then(({ value, done }) => {
				if (done) {
					setFinished(true);
					setCSVData(null);

					return;
				}

				setCSVData(value as CSVData);
			});
		}, 1000 / targetFps); // Read data at fps target

		// Cleanup on unmount or when dependencies change
		return () => clearInterval(interval);
	}, [finished, isRecording]);

	return (
		<>
			<Canvas
				className="animation-window-canvas"
				ref={ref}
			>
				<OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
				<ambientLight intensity={2} color="white" />
				<Environment preset="studio" /> {/* Lighting environment */}
				<Suspense fallback={null}>
					{/* Left Eye */}
					<RotatingModel
						csvData={csvData}
						eyePosition="Left"
						position={[-2, 0, 0]} // Shift left eye to the left
					/>

					{/* Right Eye */}
					<RotatingModel
						csvData={csvData}
						eyePosition="Right"
						position={[2, 0, 0]} // Shift right eye to the right
					/>
				</Suspense>
			</Canvas>
			<style>{`
				.animation-window-canvas {
					height: 50vh;
					aspect-ratio: 16 / 9;
				}
			`}</style>
		</>
	);
});

export default AnimationWindow;