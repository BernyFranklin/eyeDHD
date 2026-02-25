import React from 'react';

import Card from './Card';
import DoubleCard from './DoubleCard';

const homePageStyles = {
  display: 'flex',
  flexDirection: 'space-between',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

type Props = {
  setCurrent: (page: number) => void;
};

export default function HomePage({ setCurrent }: Props) {
  const handleImportClick = () => {
    setCurrent(1);
  };
  const handleGenerateEyeAnimationClick = () => {
    setCurrent(2);
  };
  const handleSideBySideViewerClick = () => {
    setCurrent(3);
  };
  const handleVisualizationClick = () => {
    setCurrent(4);
  };

  return (
    <div>
      <h1>Welcome to EyeDHD</h1>
      <p>Your go-to application for eye movement data analysis and visualization.</p>
      <div style={homePageStyles as React.CSSProperties}>
        {/* Import Raw CSV Data */}
        <button className = "card-link main-menu-button"
                onClick={handleImportClick}
                type="button"
                title="Import raw CSV data for processing. If needed the CSV file will be cleaned prior to processing.">
          <Card className = "main-menu-card"
                title="Import Raw CSV Data" 
                img="../images/file-import-solid-full.svg" />
        </button>
        {/* Generate Eye Animation */}
        <button className = "card-link main-menu-button"
                onClick={handleGenerateEyeAnimationClick}
                type="button"
                title="Generates a real time render of the eye movement based on processed data.">
        <Card className = "main-menu-card"
              title="Generate Eye Animation" 
              img="../images/eye-solid-full.svg" />
        </button>
        {/* Side-by-side Viewer */}
        <button className = "card-link main-menu-button"
                onClick={handleSideBySideViewerClick}
                type="button"
                title="View side-by-side comparison of the original video and eye movement data animation.">
          <DoubleCard title="Side-by-side Viewer"
                      img1="../images/file-video-solid-full.svg"
                      img2="../images/eye-solid-full.svg"
                      className = "main-menu-card"/>
        </button>
        {/* Eye Visualization */}
        <button className="card-link main-menu-button"
                onClick={handleVisualizationClick}
                type="button"
                title="View graphs and charts of processed eye movement data." >
          <DoubleCard title="Visualization"
                      img1="../images/file-video-solid-full.svg"
                      img2="../images/eye-solid-full.svg"
                      className = "main-menu-card"/>
        </button>
      </div>
    </div>
  );
}
