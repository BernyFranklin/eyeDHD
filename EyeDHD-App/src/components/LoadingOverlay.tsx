import React from 'react';

type Props = {
	isLoading: boolean;
};

export default function LoadingOverlay({ isLoading }: Props) {
	if (!isLoading) return null;

	return (
		<div className="loading-overlay">
			<div className="spinner"></div>
			<style>{`
				.loading-overlay {
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background-color: rgba(19, 40, 76, 0.5);
					display: flex;
					align-items: center;
					justify-content: center;
					z-index: 9999;
				}

				.spinner {
					border: 6px solid #f3f3f3;
					border-top: 6px solid #b1102b;
					border-radius: 50%;
					width: 50px;
					height: 50px;
					animation: spin 1s linear infinite;
				}

				@keyframes spin {
					0% {
						transform: rotate(0deg);
					}
					100% {
						transform: rotate(360deg);
					}
				}
			`}</style>
		</div>
	);
}
