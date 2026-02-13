// React and Three.js imports
import { Canvas } from '@react-three/fiber';
import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Environment, OrbitControls, OrthographicCamera } from '@react-three/drei';

// Component to render and rotate the 3D eye model
import RotatingModel from './ModelMovement';
import { type CSVData } from '../../types';
import RemoteStream from '../../data/RemoteStream';

type Props = {
	csvStream: RemoteStream | null;
};

// Main animation window component
export default function AnimationWindow({ csvStream }: Props) {
	const [endReached, setEndReached] = useState(false);
	const [csvData, setCSVData] = useState<CSVData | null>(null);

	useEffect(() => {
		// If not playing or no data, skip
		if (!csvStream) return;

		// Playback speed settings
		const targetFps = 200; // Desired playback frequency in Hz

		// Add interval to update current index; For timing
		const interval = setInterval(() => {
			csvStream.next().then(({ value, done }) => {
				if (done) {
					setEndReached(true);
					setCSVData(null);
					csvStream = null;

					return;
				}

				setCSVData(value as CSVData);
			});
		}, 1000 / targetFps); // Read data at fps target

		// Cleanup on unmount or when dependencies change
		return () => clearInterval(interval);
	}, [csvStream]);

	return (
		<Canvas
			style={{ width: '100%', height: '200px' }}
			onCreated={({ gl }) => {

			}}
		>
			<OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
			<OrbitControls enablePan={true} enableZoom={true} />
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
	);
}
