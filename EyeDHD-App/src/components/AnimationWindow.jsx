import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Environment, OrbitControls, useGLTF, useTexture, OrthographicCamera  } from '@react-three/drei';

import { GetPitch, GetPitchDegrees, GetYaw, GetYawDegrees} from '../utils/animationUtil';

function isValidAngle (angle) {
  return(typeof angle === 'number' && !Number.isNaN(angle) && Number.isFinite(angle));
  }

function SanityCheck(row) {
  const positions = ['Left', 'Right'];
  const axis = ['X', 'Y', 'Z'];
  let isValid = true;

  for(const pos of positions) {
    for(const ax of axis) {
      let key = `${pos}EyeForward${ax}`;
      if(row[key] === undefined || row[key] === null || row[key].trim() === '') {
        isValid = false;
      }
    }
  }

  return isValid;
}

function RotatingModel({ csvData, currentIndex, eyePosition, position=[0,0,0], isPlaying }) {
    const { scene } = useGLTF('/eye_model.glb');
    const ref = useRef();

    const targetRotation = useRef({ x: 0, y: 0, z: 0 });
    const currentRotation = useRef({ x: 0, y: 0, z: 0 });

    // Clone the scene for this instance so each eye has its own geometry
    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        // Apply position to the clone
        clone.position.set(...position);
        return clone;
    }, [scene, position]);

    useEffect(() => {
      if (!isPlaying || !csvData || currentIndex >= csvData.length) return;

      const row = csvData[currentIndex];

      // Get the forward vector components - note uppercase first letter
      const forwardX = parseFloat(row[`${eyePosition}EyeForwardX`]?.replace(/[()]/g, '') || 0);
      const forwardY = parseFloat(row[`${eyePosition}EyeForwardY`]?.replace(/[()]/g, '') || 0);
      const forwardZ = parseFloat(row[`${eyePosition}EyeForwardZ`]?.replace(/[()]/g, '') || 0);

      // Convert to pitch and yaw using your utility functions
      const pitch = GetPitch(forwardX, forwardY, forwardZ);
      const yaw = GetYaw(forwardX, forwardY, forwardZ);

      if(row[`${eyePosition}EyeStatus`] === 'VALID' && isPlaying) {
        if(SanityCheck(row) && isValidAngle(pitch) && isValidAngle(yaw)) {
          targetRotation.current = {x:pitch, y:yaw, z:0};
        }
      }
    },[csvData, currentIndex, eyePosition, isPlaying]);

    useFrame(() => {
      const r = currentRotation.current;
      const t = targetRotation.current;
      const smoothing = 1;

      r.x += (t.x - r.x) * smoothing;
      r.y += (t.y - r.y) * smoothing;
      r.z += (t.z - r.z) * smoothing;

      if (ref.current) {
        ref.current.rotation.set(r.x, r.y, r.z);
      }
    });

    return <primitive ref={ref} object={clonedScene} scale={1} />;
}

export default function AnimationWindow({ csvData, loadMoreRows, isPlaying }) {
    const [currentIndex, setCurrentIndex] = useState(0);



    useEffect(() => {
        if (!isPlaying || !csvData) return;
        if (currentIndex >= csvData.length - 1) {
            loadMoreRows();
            setCurrentIndex(0); // Reset to start after loading more data
        }
      }, [currentIndex, csvData, isPlaying, loadMoreRows]);

    useEffect(() => {
      if (!isPlaying || !csvData) return;

      const sourceHz = 200; // Original data frequency in Hz
      const targetFps = 60;  // Desired playback frequency in Hz
      const frameSkip = Math.round(sourceHz / targetFps); // For skipping frames if needed to convert to new playback speed

      const interval = setInterval(() => {
        setCurrentIndex(prevIndex => {
          // Skip frames to maintain proper playback speed
          const nextIndex = prevIndex + frameSkip;

          console.log(`Advancing from index ${prevIndex} to ${nextIndex}`);

          return nextIndex;
        });
      }, 1000/targetFps); // Read data at fps target

      return () => clearInterval(interval);
  }, [csvData, isPlaying, loadMoreRows]);

    return (
      <Canvas style={{ width: '720px', height: '480px' }} >
        <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
        <ambientLight intensity={2} color="white" />
        <Environment preset='studio' /> {/* Lighting environment */}
        <Suspense fallback={null}>
            {/* Left Eye */}
            <RotatingModel
              csvData={csvData}
              currentIndex={currentIndex}
              eyePosition="Left"
              position={[-2, 0, 0]} // Shift left eye to the left
              isPlaying={isPlaying}
            />

            {/* Right Eye */}
            <RotatingModel
              csvData={csvData}
              currentIndex={currentIndex}
              eyePosition="Right"
              position={[2, 0, 0]} // Shift right eye to the right
              isPlaying={isPlaying}
            />
        </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} />
      </Canvas>
    );
}
