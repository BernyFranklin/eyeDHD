// React and Three.js imports
import { Canvas } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState } from 'react';
import { Environment, OrbitControls, OrthographicCamera  } from '@react-three/drei';

// Component to render and rotate the 3D eye model
import RotatingModel from './ModelMovement.jsx';
import { initializeCanvasRecording, stopCanvasRecording } from './RecorderHelper.jsx';

// Main animation window component
export default function AnimationWindow({ csvData, loadMoreRows, isPlaying, currentIndex, setCurrentIndex }) {
  const [finishedRecording, setFinishedRecording] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [endReached, setEndReached] = useState(true);
  const [hasNewData, setHasNewData] = useState(false);

  // Monitor current index and load more rows if needed
  useEffect(() => {
    // If not playing or no data, skip
    if (!isPlaying || !csvData)
    {
      // End has been reached
      setEndReached(true);

      return;
    }

    // Reset end reached when playing
    setEndReached(false);

    if (currentIndex >= csvData.length - 1) {
      loadMoreRows();
      setCurrentIndex(0); // Reset to start after loading more data
    }
  }, [currentIndex, csvData, isPlaying, loadMoreRows]);

  useEffect(() => {
    // If not playing or no data, skip
    if (!isPlaying || !csvData) return;

    // Playback speed settings
    const sourceHz = 200; // Original data frequency in Hz
    const targetFps = 200;  // Desired playback frequency in Hz
    const frameSkip = Math.round(sourceHz / targetFps); // For skipping frames if needed to convert to new playback speed

    // Add interval to update current index; For timing
    const interval = setInterval(() => {
      // Update the current index based on frame skip
      setCurrentIndex(prevIndex => {
        // Skip frames to maintain proper playback speed
        const nextIndex = prevIndex + frameSkip;

        return nextIndex;
      });
    }, 1000/targetFps); // Read data at fps target

    // Cleanup on unmount or when dependencies change
    return () => clearInterval(interval);
  }, [csvData, isPlaying, loadMoreRows]);

  // Recording setup
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Helpers are defined at module scope: initializeCanvasRecording, stopCanvasRecording

  // Stop recording when CSV data runs out
  if(!isPlaying && !finishedRecording|| !csvData && mediaRecorderRef.current && !finishedRecording || endReached && mediaRecorderRef.current && !finishedRecording) {
    stopCanvasRecording(mediaRecorderRef);
    setFinishedRecording(true);
  }

  // Detect new CSV data loaded
  if(csvData && endReached && !hasNewData) {
    setHasNewData(true);
  }

  // Problem Child
  useEffect(() => {
    const recorder = mediaRecorderRef.current;

    if (hasNewData && canvasReady && recorder && endReached && csvData && isPlaying) {
      if (recorder.state !== "inactive") recorder.stop();
      chunksRef.current = [];

      recorder.start();
      console.log("Recording restarted due to new CSV data.");
      setHasNewData(false);
      setFinishedRecording(false);
    }
  }, [hasNewData, canvasReady, endReached, csvData, isPlaying]);

  return (
    <Canvas style={{ width: '720px', height: '480px' }} onCreated={({ gl }) => initializeCanvasRecording(gl.domElement, setCanvasReady, mediaRecorderRef, chunksRef)} >
      <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
      <OrbitControls enablePan={true} enableZoom={true} />
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
    </Canvas>
  );
}