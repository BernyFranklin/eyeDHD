import React, { useState, useEffect } from 'react';
import { CSVData } from '../../electron/db/tables/csv';

type Props = {
  csvData: CSVData[];
  currentIndex: number;
  isPlaying: boolean;
};

export default function PupilData({ csvData, currentIndex, isPlaying }: Props) {
  const [leftPupilSize, setLeftPupilSize] = useState(0);
  const [rightPupilSize, setRightPupilSize] = useState(0);
  const [timestamp, setTimestamp] = useState<string>('');

  // Update pupil data based on current animation frame
  useEffect(() => {
    if (!csvData || !isPlaying || currentIndex >= csvData.length) return;

    const row = csvData[currentIndex];

    // Extract pupil diameter data
    const leftPupil = row['LeftPupilDiameterInMM'];
    const rightPupil = row['RightPupilDiameterInMM'];
    const frameTime = row['CaptureTime'] || row['LogTime'];

    setLeftPupilSize(leftPupil);
    setRightPupilSize(rightPupil);
    setTimestamp(String(frameTime));
  }, [csvData, currentIndex, isPlaying]);

  // Helper function to get color based on pupil size (optional visual enhancement)
  const getPupilColor = (size: number) => {
    if (size < 2) return '#ff4444'; // Small pupil - red
    if (size < 4) return '#ffaa00'; // Medium pupil - orange
    if (size < 6) return '#44ff44'; // Large pupil - green
    return '#4444ff'; // Very large pupil - blue
  };

  // Helper function to calculate pupil size percentage for visual bars
  const getPupilPercentage = (size: number) => {
    const maxSize = 8; // Assume max pupil diameter of 8mm
    return Math.min((size / maxSize) * 100, 100);
  };

  const styles = {
    container: {
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      margin: '10px 0',
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '10px',
      textAlign: 'center',
      color: '#333'
    },
    timestamp: {
      fontSize: '12px',
      color: '#666',
      textAlign: 'center',
      marginBottom: '15px'
    },
    eyeContainer: {
      display: 'flex',
      justifyContent: 'space-around',
      gap: '20px'
    },
    eyeData: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1
    },
    eyeLabel: {
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '5px',
      color: '#333'
    },
    pupilValue: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '10px'
    },
    pupilBar: {
      width: '100%',
      height: '20px',
      backgroundColor: '#e0e0e0',
      borderRadius: '10px',
      overflow: 'hidden',
      position: 'relative'
    },
    pupilFill: {
      height: '100%',
      borderRadius: '10px',
      transition: 'width 0.1s ease-in-out'
    },
    pupilUnit: {
      fontSize: '12px',
      color: '#666',
      marginTop: '5px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header as React.CSSProperties}>Pupil Dilation Data</div>
      {timestamp && (
        <div style={styles.timestamp as React.CSSProperties}>Time: {timestamp}</div>
      )}

      <div style={styles.eyeContainer}>
        {/* Left Eye Data */}
        <div style={styles.eyeData as React.CSSProperties}>
          <div style={styles.eyeLabel}>Left Eye</div>
          <div style={{ ...styles.pupilValue, color: getPupilColor(leftPupilSize) }}>
            {leftPupilSize.toFixed(2)}
          </div>
          <div style={styles.pupilBar as React.CSSProperties}>
            <div
              style={{
                ...styles.pupilFill,
                width: `${getPupilPercentage(leftPupilSize)}%`,
                backgroundColor: getPupilColor(leftPupilSize)
              }}
            />
          </div>
          <div style={styles.pupilUnit}>mm diameter</div>
        </div>

        {/* Right Eye Data */}
        <div style={styles.eyeData as React.CSSProperties}>
          <div style={styles.eyeLabel}>Right Eye</div>
          <div style={{ ...styles.pupilValue, color: getPupilColor(rightPupilSize) }}>
            {rightPupilSize.toFixed(2)}
          </div>
          <div style={styles.pupilBar as React.CSSProperties}>
            <div
              style={{
                ...styles.pupilFill,
                width: `${getPupilPercentage(rightPupilSize)}%`,
                backgroundColor: getPupilColor(rightPupilSize)
              }}
            />
          </div>
          <div style={styles.pupilUnit}>mm diameter</div>
        </div>
      </div>

      {/* Optional: Display additional metrics */}
      {leftPupilSize > 0 && rightPupilSize > 0 && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '10px',
            fontSize: '12px',
            color: '#666'
          }}
        >
          Difference: {Math.abs(leftPupilSize - rightPupilSize).toFixed(2)}mm
        </div>
      )}
    </div>
  );
}
