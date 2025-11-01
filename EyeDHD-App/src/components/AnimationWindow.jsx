import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Environment, OrbitControls, useGLTF, useTexture, OrthographicCamera  } from '@react-three/drei';

import { GetPitch, GetYaw} from '../utils/animationUtil';

function isValidAngle (angle) {
  console.log(`Validating angle: ${angle}`);
  return(typeof angle === 'number' && !Number.isNaN(angle) && Number.isFinite(angle));
  }

function SanityCheck({row}) {
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
    
    // Clone the scene for this instance so each eye has its own geometry
    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        // Apply position to the clone
        clone.position.set(position[0], position[1], position[2]);
        return clone;
    }, [scene, position]);

    useFrame(() => {
      if (!csvData || csvData.length <= currentIndex)
      {
        return;
      } 

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
          ref.current.rotation.set(pitch, yaw, 0);
        } else {
          console.log(`${eyePosition} Eye - Pitch: ${pitch}, Yaw: ${yaw}`);
        } 
      }
    });

    return <primitive ref={ref} object={clonedScene} scale={1} />;
}

export default function AnimationWindow({ csvData, loadMoreRows, isPlaying }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    useEffect(() => {
        if (!isPlaying || !csvData) return;
        if (currentIndex >= csvData.length - 20) {
            loadMoreRows();
        }
      }, [currentIndex, csvData, isPlaying, loadMoreRows]);

    useEffect(() => {
      if (!isPlaying || !csvData) return;
      
      const frameSkip = 3; // Skip 3 frames to convert 200Hz to ~66.67Hz
      
      const interval = setInterval(() => {
        setCurrentIndex(prevIndex => {
          // Skip frames to maintain proper playback speed
          const nextIndex = prevIndex + frameSkip;
          
          // Loop back to start if we reach the end
          if (nextIndex >= csvData.length - 1) {
              return 0;
          }
          
          return nextIndex;
        });
      }, 1000/60); // Keep 60 FPS timer for smooth rendering
      
      return () => clearInterval(interval);
  }, [csvData, isPlaying, loadMoreRows]);

    return (
      <Canvas style={{ width: '720px', height: '480px' }} >
        <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
        <ambientLight intensity={2} color="white" />
        <Environment preset='studio' />
        <Suspense fallback={null}>
            {/* Left Eye */}
            <RotatingModel
              csvData={csvData}
              currentIndex={currentIndex}
              eyePosition="Left"
              position={[-2, 0, 0]} // Larger offset to left
              isPlaying={isPlaying}
            />

            {/* Right Eye */}
            <RotatingModel
              csvData={csvData}
              currentIndex={currentIndex}
              eyePosition="Right"
              position={[2, 0, 0]} // Larger offset to right
              isPlaying={isPlaying}
            />
        </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} />
      </Canvas>
    );
}
