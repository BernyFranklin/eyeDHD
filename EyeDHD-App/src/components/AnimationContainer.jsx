import AnimationWindow from "./animation/AnimationWindow.jsx";
import PupilData from "./PupilData.jsx";
import Button from "./Button";
import { useState } from "react";

export default function AnimationContainer({
  csvData,
  loadMoreRows,
  isPlaying,
  setIsPlaying
}) {
  // Track the current frame index to sync PupilData with animation
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="animation-window-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <AnimationWindow
        csvData={csvData}
        loadMoreRows={loadMoreRows}
        isPlaying={isPlaying}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
      />
      
      <PupilData
        csvData={csvData}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
      />
      
      <div className="animation-controls">
        <Button
          onClick={() => setIsPlaying(!isPlaying)}
          className="btn"
          buttonText={isPlaying ? 'Pause Animation' : 'Play Animation'}
        />
      </div>
    </div>
  );
}
