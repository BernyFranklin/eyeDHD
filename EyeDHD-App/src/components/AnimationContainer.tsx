import React from 'react';

import AnimationWindow from './animation/AnimationWindow';
import Button from './Button';

import { type CSVData } from '../types';
import RemoteStream from '../data/RemoteStream';

const styles = {
  container: {
    width: '100%',
    textWrap: 'wrap'
  }
};

type Props = {
  csvStream: RemoteStream | null;
};

export default function AnimationContainer({
  csvStream,
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
        csvStream={csvStream}
      />
      <div className="animation-controls">
      </div>
    </div>
  );
}
