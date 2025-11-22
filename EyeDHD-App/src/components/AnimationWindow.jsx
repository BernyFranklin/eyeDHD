import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import {
  Environment,
  OrbitControls,
  useGLTF,
  useTexture,
  OrthographicCamera
} from '@react-three/drei';

import { GetPitch, GetPitchDegrees, GetYaw, GetYawDegrees } from '../utils/animationUtil';

function isValidAngle(angle) {
  return typeof angle === 'number' && !Number.isNaN(angle) && Number.isFinite(angle);
}

function SanityCheck(row) {
  const positions = ['Left', 'Right'];
  const axis = ['X', 'Y', 'Z'];
  let isValid = true;

  for (const pos of positions) {
    for (const ax of axis) {
      let key = `${pos}EyeForward${ax}`;
      const value = row[key];

      // Handle both string and number values safely
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (typeof value === 'number' && (isNaN(value) || !isFinite(value)))
      ) {
        isValid = false;
        break;
      }
    }
    if (!isValid) break;
  }

  return isValid;
}

function RotatingModel({
  csvData,
  currentIndex,
  lastValid,
  eyePosition,
  position = [0, 0, 0],
  isPlaying
}) {
  const { scene } = useGLTF('/eye_model.glb');
  const ref = useRef();

  const targetRotation = useRef(lastValid.current);
  const currentRotation = useRef(lastValid.current);

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

    // Add safety check for row
    if (!row) {
      console.log(`Row at index ${currentIndex} is undefined`);
      return;
    }

    currentRotation.current = targetRotation.current;

    // Get the forward vector components - note uppercase first letter
    // Add safety checks for each property access
    const forwardXKey = `${eyePosition}EyeForwardX`;
    const forwardYKey = `${eyePosition}EyeForwardY`;
    const forwardZKey = `${eyePosition}EyeForwardZ`;

    console.log(`Looking for keys: ${forwardXKey}, ${forwardYKey}, ${forwardZKey}`);
    console.log(`Available keys in row:`, Object.keys(row));

    // Handle both string and number values more robustly
    const getNumericValue = (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remove parentheses and parse
        const cleaned = value.replace(/[()]/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    const forwardX = getNumericValue(row[forwardXKey]);
    const forwardY = getNumericValue(row[forwardYKey]);
    const forwardZ = getNumericValue(row[forwardZKey]);

    console.log(`Parsed values - X: ${forwardX}, Y: ${forwardY}, Z: ${forwardZ}`);

    // Convert to pitch and yaw using your utility functions
    const pitch = GetPitch(forwardX, forwardY, forwardZ);
    const yaw = GetYaw(forwardX, forwardY, forwardZ);

    console.log(`Calculated pitch: ${pitch}, yaw: ${yaw}`);

    const eyeStatusKey = `${eyePosition}EyeStatus`;
    const eyeStatus = row[eyeStatusKey];

    console.log(`Eye status for ${eyePosition}: ${eyeStatus}`);
    console.log(`SanityCheck result:`, SanityCheck(row));
    console.log(`isValidAngle pitch:`, isValidAngle(pitch));
    console.log(`isValidAngle yaw:`, isValidAngle(yaw));

    if (eyeStatus === 'VALID' && isPlaying) {
      if (SanityCheck(row) && isValidAngle(pitch) && isValidAngle(yaw)) {
        console.log(`Updating rotation - pitch: ${pitch}, yaw: ${yaw}`);
        lastValid.current = { x: pitch, y: yaw, z: 0 };
        targetRotation.current = { x: pitch, y: yaw, z: 0 };
      } else {
        console.log(`Failed validation checks`);
      }
    } else {
      console.log(`Eye status not VALID or not playing`);
    }
  }, [currentIndex, eyePosition, isPlaying]);

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
  const lastValidLeft = useRef({ x: 0, y: 0, z: 0 });
  const lastValidRight = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (!isPlaying || !csvData) return;
    const loadRows = async () => {
      await loadMoreRows();
      setCurrentIndex(0);
    };

    if (currentIndex >= csvData.length - 1) {
      loadRows();
    }
  }, [currentIndex, isPlaying, loadMoreRows]);

  useEffect(() => {
    if (!isPlaying || !csvData) return;

    const sourceHz = 200; // Original data frequency in Hz
    const targetFps = 200; // Desired playback frequency in Hz
    const frameSkip = Math.round(sourceHz / targetFps); // For skipping frames if needed to convert to new playback speed

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        // Skip frames to maintain proper playback speed
        const nextIndex = prevIndex + frameSkip;

        // Debug logging (can be removed later)
        if (csvData && csvData.length > 0) {
          console.log(
            `Advancing from index ${prevIndex} to ${nextIndex}, CSV data length: ${csvData.length}`
          );
          if (nextIndex < csvData.length) {
            console.log(`Current row keys:`, Object.keys(csvData[nextIndex]));
          }
        } else {
          console.log(`No CSV data available`);
        }

        return nextIndex;
      });
    }, 1000 / targetFps); // Read data at fps target

    return () => clearInterval(interval);
  }, [isPlaying, loadMoreRows]);

  return (
    <Canvas style={{ width: '720px', height: '480px' }}>
      <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
      <ambientLight intensity={2} color="white" />
      <Environment preset="studio" /> {/* Lighting environment */}
      <Suspense fallback={null}>
        {/* Left Eye */}
        <RotatingModel
          csvData={csvData}
          currentIndex={currentIndex}
          lastValid={lastValidLeft}
          eyePosition="Left"
          position={[-2, 0, 0]} // Shift left eye to the left
          isPlaying={isPlaying}
        />

        {/* Right Eye */}
        <RotatingModel
          csvData={csvData}
          currentIndex={currentIndex}
          lastValid={lastValidRight}
          eyePosition="Right"
          position={[2, 0, 0]} // Shift right eye to the right
          isPlaying={isPlaying}
        />
      </Suspense>
      <OrbitControls enablePan={true} enableZoom={true} />
    </Canvas>
  );
}
