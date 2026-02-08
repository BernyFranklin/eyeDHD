// React and Three.js imports
import { Canvas } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState } from 'react';
import { Environment, OrbitControls, OrthographicCamera } from '@react-three/drei';

// Component to render and rotate the 3D eye model
import RotatingModel from './ModelMovement.jsx';
import { initializeCanvasRecording, stopCanvasRecording } from './RecorderHelper.jsx';
import { type CSVData } from '../../../electron/data/tables/csv';

type Props = {
  csvData: CSVData[];
  loadMoreRows: () => void;
  isPlaying: boolean;
  shouldRecord?: boolean;
  onIndexChange?: (index: number) => void;
};

// Main animation window component
export default function AnimationWindow({
  csvData,
  loadMoreRows,
  isPlaying,
  shouldRecord = false,
  onIndexChange
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finishedRecording, setFinishedRecording] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [endReached, setEndReached] = useState(false);
  const [hasNewData, setHasNewData] = useState(false);

  // Notify parent of current index changes
  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(currentIndex);
    }
  }, [currentIndex, onIndexChange]);

  // Monitor current index and load more rows if needed
  useEffect(() => {
    // If not playing or no data, skip
    if (!isPlaying || !csvData) {
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
    const targetFps = 200; // Desired playback frequency in Hz
    const frameSkip = Math.round(sourceHz / targetFps); // For skipping frames if needed to convert to new playback speed

    // Add interval to update current index; For timing
    const interval = setInterval(() => {
      // Update the current index based on frame skip
      setCurrentIndex((prevIndex) => {
        // Skip frames to maintain proper playback speed
        const nextIndex = prevIndex + frameSkip;

        return nextIndex;
      });
    }, 1000 / targetFps); // Read data at fps target

    // Cleanup on unmount or when dependencies change
    return () => clearInterval(interval);
  }, [csvData, isPlaying]);

  // Recording setup
  const mediaRecorderRef = useRef<MediaRecorder>(null);
  const chunksRef = useRef([]);

  // Helpers are defined at module scope: initializeCanvasRecording, stopCanvasRecording

  // Manage recording strictly via effects; avoid side effects in render.

  // Detect new CSV data loaded
  useEffect(() => {
    if (csvData && endReached) {
      setHasNewData(true);
    }
  }, [csvData, endReached]);

  // Start/stop recording based on shouldRecord prop and canvas readiness
  useEffect(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !canvasReady) return;

    // Start when shouldRecord is true and we have data, and recorder is inactive
    if (shouldRecord && isPlaying && csvData && recorder.state === 'inactive') {
      chunksRef.current = [];
      recorder.start();
      console.log('Recording started after inactive.');
      setFinishedRecording(false);
    }

    // Stop when shouldRecord is false or when we hit the end
    if ((!shouldRecord || !isPlaying || endReached) && recorder.state === 'recording') {
      recorder.stop();
      console.log('Recording stopped due to playback end or stop.');
      // Log isPlaying and endReached states separately
      console.log(
        'isPlaying:',
        isPlaying,
        'endReached:',
        endReached,
        'csvLength',
        csvData ? csvData.length : 'no data'
      );
      setFinishedRecording(true);
    }
  }, [shouldRecord, isPlaying, csvData, endReached, canvasReady]);

  // Handle new data arrival: if recording and playing, restart cleanly once.
  useEffect(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !canvasReady) return;

    if (hasNewData && shouldRecord && isPlaying && csvData) {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
      chunksRef.current = [];
      recorder.start();
      console.log('Recording restarted due to new data.');
      setHasNewData(false);
      setFinishedRecording(false);
    }
  }, [hasNewData, shouldRecord, isPlaying, csvData, canvasReady]);

  return (
    <Canvas
      style={{ width: '100%', height: '200px' }}
      onCreated={({ gl }) =>
        initializeCanvasRecording(
          gl.domElement,
          setCanvasReady,
          mediaRecorderRef,
          chunksRef
        )
      }
    >
      <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
      <OrbitControls enablePan={true} enableZoom={true} />
      <ambientLight intensity={2} color="white" />
      <Environment preset="studio" /> {/* Lighting environment */}
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
