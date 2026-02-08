import React, { RefObject } from 'react';

// Initialize recording helper
function initializeCanvasRecording(
  canvas: HTMLCanvasElement,
  setCanvasReady: any,
  mediaRecorderRef: RefObject<MediaRecorder | null>,
  chunksRef: RefObject<BlobPart[]>
) {
  console.log('Canvas ready:', canvas);
  const stream = canvas.captureStream(60);
  setCanvasReady(true);

  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

  mediaRecorderRef.current = recorder;
  chunksRef.current = [];

  recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animation.webm';
    a.click();
  };
}

// Stop recording helper
function stopCanvasRecording(mediaRecorderRef: RefObject<MediaRecorder>) {
  const recorder = mediaRecorderRef.current;
  if (!recorder) {
    console.warn('Recorder not initialized yet, skipping stop.');
    return;
  }
  if (recorder.state === 'inactive') {
    console.warn('Recorder already stopped.');
    return;
  }
  recorder.stop();
  console.log('Recording stopped.');
}

export { initializeCanvasRecording, stopCanvasRecording };
