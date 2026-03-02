// React and Three.js imports
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

// Custom utility functions
import {
	GetPitch,
	GetYaw,
	NormalizePupilDilation,
	CheckDataValidity
} from './animationUtil';

import { type CSVData } from '@src/data/types';

type Props = {
	csvData: CSVData | null;
	eyePosition: 'Left' | 'Right';
	position?: [number, number, number];
};

// Component for a rotating 3D model representing an eye
export default function RotatingModel({
	csvData,
	eyePosition,
	position = [0, 0, 0]
}: Props) {
	// Load the GLTF model
	const { scene } = useGLTF('/eye_model.glb');
	const ref = useRef<any>(null);

	// Clone the scene and collect all meshes with an "Open" shapekey
	const { clonedScene, morphMeshes } = useMemo(() => {
		const clone = scene.clone(true);
		clone.position.set(...position);

		const targets: any[] = [];
		clone.traverse((o: any) => {
			if (o.isMesh && o.morphTargetDictionary && o.morphTargetInfluences) {
				if (o.morphTargetDictionary['Open'] !== undefined) {
					targets.push(o);
				}
			}
		});

		return { clonedScene: clone, morphMeshes: targets };
	}, [scene, position]);

	// Keep track of target and current rotation
	const targetRotation = useRef({ x: 0, y: 0, z: 0 });
	const currentRotation = useRef({ x: 0, y: 0, z: 0 });
	const targetPupilDilation = useRef(0);

	// Update target rotation based on CSV data
	useEffect(() => {
	    // If no data or not playing, skip
	    if (!csvData) return;

		const row = csvData;
		// Get the forward vector components - note uppercase first letter
		const forwardX = row[`${eyePosition}EyeForwardX`];
		const forwardY = row[`${eyePosition}EyeForwardY`];
		const forwardZ = row[`${eyePosition}EyeForwardZ`];

		// Convert to pitch and yaw using your utility functions
		const pitch = GetPitch(forwardX, forwardY, forwardZ);
		const yaw = GetYaw(forwardX, forwardY, forwardZ);

		// Update target rotation if eye status is VALID
		if (row[`${eyePosition}EyeStatus`] === 'VALID') {
			if (CheckDataValidity(pitch, row) && CheckDataValidity(yaw, row)) {
				targetRotation.current = { x: pitch, y: yaw, z: 0 };
				targetPupilDilation.current = NormalizePupilDilation(
					row[`${eyePosition}PupilDiameterInMM`]
				);
			}
		}
	}, [csvData, eyePosition]);

	// Smoothly interpolate current rotation towards target rotation
	useFrame(() => {
		// Values for smoothing
		const r = currentRotation.current;
		const t = targetRotation.current;
		const smoothing = 1;

		// Update current rotation towards target
		r.x += (t.x - r.x) * smoothing;
		r.y += (t.y - r.y) * smoothing;
		r.z += (t.z - r.z) * smoothing;

		// Apply the rotation to the model
		if (ref.current) {
			ref.current.rotation.set(r.x, r.y, r.z);
		}

		// Apply morph target (shape key)
		if (morphMeshes?.length) {
			for (const m of morphMeshes) {
				const idx = m.morphTargetDictionary['Open'];
				if (idx !== undefined) {
					m.morphTargetInfluences[idx] = targetPupilDilation.current;
				}
			}
		}
	});

	// Render the cloned scene with applied rotation
	return <primitive ref={ref} object={clonedScene} scale={1} />;
}