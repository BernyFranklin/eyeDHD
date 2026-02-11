import React from 'react';

import AnimationWindow from './animation/AnimationWindow';
import Button from './Button';

import { type CSVData } from '../../electron/db/tables/csv';
import RemoteStream from '../data/RemoteStream';

const styles = {
  container: {
    width: '100%',
    textWrap: 'wrap'
  }
};

type Props = {
  csvData: RemoteStream;
  loadMoreRows: any;
  isPlaying: boolean;
  setIsPlaying: any;
};

export default function AnimationContainer({
  csvData,
  loadMoreRows,
  isPlaying,
  setIsPlaying
}: Props) {
  return (
    <div
      className="animation-window-container"
      style={styles.container as React.CSSProperties}
    >
      <h3>Preview of Animation</h3>
      <p>
        Use the controls below to play or pause the animation preview. To save the
        animation, use the export options provided.
      </p>
      <AnimationWindow
        csvData={csvData}
        loadMoreRows={loadMoreRows}
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
