import React from 'react';

import Button from './Button';
import Card from './Card';
import DoubleCard from './DoubleCard';



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
			<div className="home-page-actions">
				{/* Import Raw CSV Data */}
				<Button
					className="card-link main-menu-button"
					onClick={handleImportClick}
					type="button"
					title="Import raw CSV data for processing. If needed the CSV file will be cleaned prior to processing."
				>
					<Card
						className = "main-menu-card"
						title="Import Raw CSV Data"
						img="../images/file-import-solid-full.svg"
					/>
				</Button>
				{/* Generate Eye Animation */}
				<Button
					className="card-link main-menu-button"
					onClick={handleGenerateEyeAnimationClick}
					type="button"
					title="Generates a real time render of the eye movement based on processed data."
				>
					<Card
						className = "main-menu-card"
						title="Generate Eye Animation"
						img="../images/eye-solid-full.svg"
					/>
				</Button>
				{/* Side-by-side Viewer */}
				<Button
					className="card-link main-menu-button"
					onClick={handleSideBySideViewerClick}
					type="button"
					title="View side-by-side comparison of the original video and eye movement data animation."
				>
					<DoubleCard title="Side-by-side Viewer"
						img1="../images/file-video-solid-full.svg"
						img2="../images/eye-solid-full.svg"
						className = "main-menu-card"
					/>
				</Button>
				{/* Eye Visualization */}
				<Button
					className="card-link main-menu-button"
					onClick={handleVisualizationClick}
					type="button"
					title="View graphs and charts of processed eye movement data."
				>
					<DoubleCard
						title="Visualization"
						img1="../images/file-video-solid-full.svg"
						img2="../images/eye-solid-full.svg"
						className = "main-menu-card"
					/>
				</Button>
			</div>
			<style>{`
				.home-page-actions {
					display: flex;
					flex-direction: space-between;
					align-items: center;
					justify-content: center;
					padding: 20px;
				}

				.main-menu-button {
					background: none;
					border: none;
					padding: 0;
					margin-top: 0;
					width: auto;
					display: inline-block;
					border-radius: 0;
					font-size: inherit;
					font-weight: inherit;
					color: inherit;
				}

				.main-menu-card {
					box-shadow: rgba(0, 0, 0, 0.9) 0px 2px 2px !important;
				}

				.card-link:hover {
					cursor: pointer;
					transform: scale(1.05);
					transition: transform 0.3s ease-in-out;
				}
				`}</style>
		</div>
	);
}
