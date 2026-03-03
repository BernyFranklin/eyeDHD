import React from 'react';

import Card from '../../components/Card';
import DoubleCard from '../../components/DoubleCard';

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
        <a className="card-link" onClick={handleImportClick}>
          <Card title="Import Raw CSV Data" img="../images/file-import-solid-full.svg" />
        </a>
        <a className="card-link" onClick={handleGenerateEyeAnimationClick}>
          <Card title="Generate Eye Animation" img="../images/eye-solid-full.svg" />
        </a>
        <a className="card-link" onClick={handleSideBySideViewerClick}>
          <DoubleCard
            title="Side-by-side Viewer"
            img1="../images/file-video-solid-full.svg"
            img2="../images/eye-solid-full.svg"
          />
        </a>
        <a className="card-link" onClick={handleVisualizationClick}>
          <DoubleCard
            title="Visualization"
            img1="../images/file-video-solid-full.svg"
            img2="../images/eye-solid-full.svg"
          />
        </a>
      </div>
    </div>
  );
}
