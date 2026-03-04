import React, { useState, useEffect } from 'react';

import { type TrackingData } from '@src/data/types';

type Props = {
	csvData: TrackingData[];
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

	const getPupilClassSuffix = (size: number) => {
		if (size < 2) return 'small';
		if (size < 4) return 'medium';
		if (size < 6) return 'large';
		return 'xlarge';
	};

	return (
		<div className="pupil-data">
			<div className="pupil-data__header">Pupil Dilation Data</div>
			{timestamp && (
				<div className="pupil-data__timestamp">Time: {timestamp}</div>
			)}

			<div className="pupil-data__eyes">
				{/* Left Eye Data */}
				<div className="pupil-data__eye">
					<div className="pupil-data__label">Left Eye</div>
					<div className={`pupil-data__value pupil-data__value--${getPupilClassSuffix(leftPupilSize)}`}>
						{leftPupilSize.toFixed(2)}
					</div>
					<div className="pupil-data__bar">
						<div
							className={`pupil-data__fill pupil-data__fill--${getPupilClassSuffix(leftPupilSize)}`}
							style={{ ['--pupil-width' as any]: `${getPupilPercentage(leftPupilSize)}%` }}
						/>
					</div>
					<div className="pupil-data__unit">mm diameter</div>
				</div>

				{/* Right Eye Data */}
				<div className="pupil-data__eye">
					<div className="pupil-data__label">Right Eye</div>
					<div className={`pupil-data__value pupil-data__value--${getPupilClassSuffix(rightPupilSize)}`}>
						{rightPupilSize.toFixed(2)}
					</div>
					<div className="pupil-data__bar">
						<div
							className={`pupil-data__fill pupil-data__fill--${getPupilClassSuffix(rightPupilSize)}`}
							style={{ ['--pupil-width' as any]: `${getPupilPercentage(rightPupilSize)}%` }}
						/>
					</div>
					<div className="pupil-data__unit">mm diameter</div>
				</div>
			</div>

			{/* Optional: Display additional metrics */}
			{leftPupilSize > 0 && rightPupilSize > 0 && (
				<div className="pupil-data__difference">
					Difference: {Math.abs(leftPupilSize - rightPupilSize).toFixed(2)}mm
				</div>
			)}
			<style>{`
				.pupil-data {
					background-color: #f5f5f5;
					border: 1px solid #ddd;
					border-radius: 8px;
					padding: 15px;
					margin: 10px 0;
					font-family: Arial, sans-serif;
				}

				.pupil-data__header {
					font-size: 18px;
					font-weight: bold;
					margin-bottom: 10px;
					text-align: center;
					color: #333;
				}

				.pupil-data__timestamp {
					font-size: 12px;
					color: #666;
					text-align: center;
					margin-bottom: 15px;
				}

				.pupil-data__eyes {
					display: flex;
					justify-content: space-around;
					gap: 20px;
				}

				.pupil-data__eye {
					display: flex;
					flex-direction: column;
					align-items: center;
					flex: 1;
				}

				.pupil-data__label {
					font-size: 14px;
					font-weight: bold;
					margin-bottom: 5px;
					color: #333;
				}

				.pupil-data__value {
					font-size: 20px;
					font-weight: bold;
					margin-bottom: 10px;
				}

				.pupil-data__bar {
					width: 100%;
					height: 20px;
					background-color: #e0e0e0;
					border-radius: 10px;
					overflow: hidden;
					position: relative;
				}

				.pupil-data__fill {
					height: 100%;
					border-radius: 10px;
					transition: width 0.1s ease-in-out;
					width: var(--pupil-width, 0%);
				}

				.pupil-data__unit {
					font-size: 12px;
					color: #666;
					margin-top: 5px;
				}

				.pupil-data__difference {
					text-align: center;
					margin-top: 10px;
					font-size: 12px;
					color: #666;
				}

				.pupil-data__value--small {
					color: #ff4444;
				}

				.pupil-data__value--medium {
					color: #ffaa00;
				}

				.pupil-data__value--large {
					color: #44ff44;
				}

				.pupil-data__value--xlarge {
					color: #4444ff;
				}

				.pupil-data__fill--small {
					background-color: #ff4444;
				}

				.pupil-data__fill--medium {
					background-color: #ffaa00;
				}

				.pupil-data__fill--large {
					background-color: #44ff44;
				}

				.pupil-data__fill--xlarge {
					background-color: #4444ff;
				}
			`}</style>
		</div>
	);
}
