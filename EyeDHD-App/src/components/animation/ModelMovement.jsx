// React and Three.js imports
import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

// Custom utility functions
import { GetPitch, GetYaw, NormalizePupilDilation, CheckDataValidity } from '../../utils/animationUtil.js';

// Component for a rotating 3D model representing an eye
export default function RotatingModel({ csvData, currentIndex, eyePosition, position = [0, 0, 0], isPlaying }) {
    // Load the GLTF model
    const { scene } = useGLTF('/eye_model.glb');
    const ref = useRef();

    // Clone the scene for this instance so each eye has its own geometry
    const { clonedScene, mesh } = useMemo(() => {
        const clone = scene.clone(true);
        clone.position.set(...position);

        let targetMesh = null;
        clone.traverse(o => {
            if (o.isMesh && o.morphTargetDictionary) {
                targetMesh = o;
            }
        });

        return { clonedScene: clone, mesh: targetMesh };
    }, [scene, position]);

    // Keep track of target and current rotation
    const targetRotation = useRef({ x: 0, y: 0, z: 0 });
    const currentRotation = useRef({ x: 0, y: 0, z: 0 });

    const targetPupilDilation = useRef(0);

    // Update target rotation based on CSV data
    useEffect(() => {
        // If no data or not playing, skip
        if (!isPlaying || !csvData || currentIndex >= csvData.length) return;

        const row = csvData[currentIndex];

        console.log('Current Eye Position:', eyePosition);

        // Get the forward vector components - note uppercase first letter
        const forwardX = row[`${eyePosition}EyeForwardX`];
        const forwardY = row[`${eyePosition}EyeForwardY`];
        const forwardZ = row[`${eyePosition}EyeForwardZ`];

        // Convert to pitch and yaw using your utility functions
        const pitch = GetPitch(forwardX, forwardY, forwardZ);
        const yaw = GetYaw(forwardX, forwardY, forwardZ);

        // Update target rotation if eye status is VALID
        if (row[`${eyePosition}EyeStatus`] === 'VALID' && isPlaying) {
            if (CheckDataValidity(pitch, row) && CheckDataValidity(yaw, row)) {
                targetRotation.current = { x: pitch, y: yaw, z: 0 };
                targetPupilDilation.current = NormalizePupilDilation(row[`${eyePosition}PupilDiameterInMM`]);
                console.log("Row pupil data: ", row[`${eyePosition}PupilDiameterInMM`]);
            }
        }
    }, [csvData, currentIndex, eyePosition, isPlaying]);

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
        if (ref.current) { ref.current.rotation.set(r.x, r.y, r.z); }

        // Apply morph target (shape key)
        if (mesh?.morphTargetDictionary && mesh?.morphTargetInfluences) {
            const dict = mesh.morphTargetDictionary;
            const infl = mesh.morphTargetInfluences;

            const openIndex = dict["Open"]; // ← your shape key name

            if (openIndex !== undefined) {
                infl[openIndex] = targetPupilDilation.current;
            }
        }
    });

    // Render the cloned scene with applied rotation
    return <primitive ref={ref} object={clonedScene} scale={1} />;
}