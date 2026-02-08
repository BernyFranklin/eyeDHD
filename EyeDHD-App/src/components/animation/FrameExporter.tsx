// React and Three.js imports
import { Canvas, RootState } from '@react-three/fiber';
import React, { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Environment, OrthographicCamera } from '@react-three/drei';

// Component to render the 3D eye model
import RotatingModel from './ModelMovement';

type Props = {
  csvData: Array<any>; // CSV data array
  onProgress: (progress: number, currentFrame: number, totalFrames: number) => void; // Progress callback
  onExportComplete: (result: {
    success: boolean;
    outputPath?: string;
    frameCount?: number;
    error?: string;
  }) => void; // Export completion callback
  isExporting: boolean; // Whether the export process is active
  fileName: string; // Original CSV file name for naming the output video
};

/**
 * FrameExporter - Component that uses MediaRecorder to capture the canvas
 * This approach is more reliable than frame-by-frame capture for large datasets
 */
export default function FrameExporter({
  csvData,
  onProgress,
  onExportComplete,
  isExporting = false,
  fileName
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>(null);
  const isCancelledRef = useRef(false);

  // Initialize MediaRecorder when canvas is ready
  const initializeRecording = useCallback(
    (canvas: HTMLCanvasElement) => {
      try {
        // Create stream from canvas at 60fps
        const stream = canvas.captureStream(60);

        // Try MP4 first, fallback to WebM if not supported
        let options: any;
        let fileExtension: string;

        if (MediaRecorder.isTypeSupported('video/mp4; codecs=avc1')) {
          options = { mimeType: 'video/mp4; codecs=avc1' };
          fileExtension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          options = { mimeType: 'video/mp4' };
          fileExtension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm; codecs=h264')) {
          options = { mimeType: 'video/webm; codecs=h264' };
          fileExtension = 'webm';
        } else {
          options = { mimeType: 'video/webm; codecs=vp8' };
          fileExtension = 'webm';
        }

        console.log('Using codec:', options.mimeType);

        const recorder = new MediaRecorder(stream, options);

        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          // Only save video if export wasn't cancelled
          if (!isCancelledRef.current) {
            const blob = new Blob(chunksRef.current, { type: options.mimeType });
            saveVideoFile(blob, fileExtension);
          } else {
            console.log('Export was cancelled, skipping video save');
            onExportComplete({ success: false, error: 'Export cancelled' });
          }
        };

        setIsReady(true);
      } catch (error: any) {
        console.error('Failed to initialize MediaRecorder:', error);
        onExportComplete({ success: false, error: error.message });
      }
    },
    [onExportComplete]
  );

  // Save the video file
  const saveVideoFile = async (blob: Blob, extension = 'mp4') => {
    try {
      // Convert blob to array buffer then to Uint8Array for electron
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Use electron's save dialog
      const result = await window.electron.csv.saveFile({
        defaultPath: `${fileName.replace('.csv', '')}_animation.${extension}`,
        filters: [
          { name: 'MP4 Video', extensions: ['mp4'] },
          { name: 'WebM Video', extensions: ['webm'] }
        ],
        data: uint8Array
      });

      if (result.success) {
        window.electron.notify(`Animation exported successfully to ${result.filePath}`);
        onExportComplete({
          success: true,
          outputPath: result.filePath,
          frameCount: csvData.length
        });
      } else {
        onExportComplete({ success: false, error: 'Save cancelled' });
      }
    } catch (error: any) {
      console.error('Failed to save video file:', error);
      onExportComplete({ success: false, error: error.message });
    }
  };

  // Start/stop recording based on export state
  useEffect(() => {
    if (!isReady || !mediaRecorderRef.current) return;

    if (isExporting && mediaRecorderRef.current.state === 'inactive') {
      // Start recording - reset cancellation flag
      isCancelledRef.current = false;
      chunksRef.current = [];
      mediaRecorderRef.current.start();
      setCurrentIndex(0);

      // Start animation playback
      startAnimation();

      console.log(`Export started for ${csvData.length} frames`);
    } else if (!isExporting && mediaRecorderRef.current.state === 'recording') {
      // Stop recording - mark as cancelled
      isCancelledRef.current = true;
      console.log('Export manually cancelled');
      mediaRecorderRef.current.stop();
      stopAnimation();
    }
  }, [isExporting, isReady]);

  const startAnimation = () => {
    if (intervalRef.current) return;

    // Process every frame in the CSV data
    const sourceHz = 200; // Original data frequency
    const playbackFps = 30; // Target playback framerate for smooth video

    // Calculate how many source frames to skip to achieve target FPS
    // For 200Hz data at 30fps playback: skip every ~6.67 frames, so we'll process every 7th frame
    const frameSkip = Math.max(1, Math.round(sourceHz / playbackFps));

    console.log(
      `Processing CSV with ${csvData.length} total frames, skipping every ${frameSkip} frames for ${playbackFps}fps playback`
    );

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + frameSkip;

        // Use setTimeout to defer progress update to avoid setState during render
        setTimeout(() => {
          if (onProgress) {
            const progress = (nextIndex / csvData.length) * 100;
            onProgress(progress, nextIndex, csvData.length);
          }
        }, 0);

        // Check if we've reached the end of the CSV data
        if (nextIndex >= csvData.length) {
          // Stop recording after a short delay to ensure last frames are captured
          setTimeout(() => {
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state === 'recording'
            ) {
              console.log(
                `Recording complete. Processed ${csvData.length} total frames.`
              );
              mediaRecorderRef.current.stop();
            }
          }, 500);
          return csvData.length - 1; // Clamp to last valid frame
        }

        return nextIndex;
      });
    }, 1000 / playbackFps); // Use playback FPS for interval timing
  };

  const stopAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        isCancelledRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        visibility: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <Canvas
        ref={canvasRef}
        style={{ width: '1920px', height: '1080px' }}
        onCreated={({ gl }: RootState) => {
          // Configure for high quality
          gl.outputColorSpace = 'srgb';
          //gl.antialias = true;
          //gl.preserveDrawingBuffer = true;

          initializeRecording(gl.domElement);
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        }}
      >
        <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
        <ambientLight intensity={2} color="white" />
        <Environment preset="studio" />
        <Suspense fallback={null}>
          {/* Left Eye */}
          <RotatingModel
            csvData={csvData}
            currentIndex={Math.min(currentIndex, csvData.length - 1)}
            eyePosition="Left"
            position={[-2, 0, 0]}
            isPlaying={isExporting}
          />

          {/* Right Eye */}
          <RotatingModel
            csvData={csvData}
            currentIndex={Math.min(currentIndex, csvData.length - 1)}
            eyePosition="Right"
            position={[2, 0, 0]}
            isPlaying={isExporting}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
