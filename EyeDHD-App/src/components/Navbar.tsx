import React from 'react';

import { useSelector } from '@src/data/hooks';
import { selectButtons } from '@src/data/features/global';

const disabledLinkProps = {
	onClick: (e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault(),
	'aria-disabled': true,
	tabIndex: -1
};

export default function Navbar() {
	const buttons = useSelector(selectButtons);
	const disabledAnchorProps = buttons.disabled ? disabledLinkProps : {};

	return (
		<nav className="navbar">
			<span className="navbar-logo">
				<img
					className="navbar-logo-image"
					src="./images/fs-logo-white.png"
					alt="Logo"
				/>
				<img
					className="navbar-logo-image"
					src="./images/sight-logo.png"
					alt="SIGHT Logo"
				/>
			</span>
			<span className="navbar-links">
				<div className={`navbar-link${buttons.disabled ? ' disabled' : ''}`}>
					<a
						href='/home'
						className="home-link"
						title="Home"
						{...disabledAnchorProps}
					>
						<img
							src="./images/house-solid-full.svg"
							alt="Home"
							className="navbar-icon"
						/>
					</a>
				</div>
			</span>
			<style>{`
				:root {
					--navbar-height: 80px;
				}

				.navbar {
					background-color: #b1102b;
					margin: 0;
					height: var(--navbar-height);
					padding: 0 20px;
					display: flex;
					align-items: center;
					justify-content: space-between;
				}

				.navbar-logo {
					display: flex;
					align-items: center;
					gap: 10px;
				}

				.navbar-logo-image {
					height: 60px;
				}

				.navbar-icon {
					width: 32px;
					height: 32px;
					color: white;
					filter: brightness(0) invert(1);
					margin: 0;
					display: block;
				}

				.navbar-links {
					display: flex;
					gap: 15px;
				}

				.navbar-links a {
					color: var(--action-text);
					text-decoration: none;
					font-weight: 600;
					display: flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100%;
				}

				.navbar-links a:hover {
					text-decoration: underline;
				}

				.navbar-links a[aria-disabled='true'] {
					cursor: not-allowed;
					opacity: 0.8;
					text-decoration: none;
					pointer-events: none;
				}

				.navbar-links a[aria-disabled='true']:hover {
					text-decoration: none;
				}

				.navbar-link {
					background-color: var(--action-bg);
					border-radius: var(--action-radius);
					padding: 0;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					transition: background-color 0.3s ease;
					width: 54px;
					height: 54px;
				}

				.navbar-link:hover {
					background-color: var(--action-bg-hover);
				}

				.navbar-link.disabled {
					background-color: var(--action-bg-disabled);
					opacity: 0.8;
					cursor: not-allowed;
				}

				.navbar-link.disabled:hover {
					background-color: var(--action-bg-disabled);
				}

				.home-link:hover {
					transform: translateX(-2px);
					transition: transform 0.3s ease-in-out;
				}
			`}</style>
		</nav>
	);
}

// <div className={`navbar-link${buttons.disabled ? ' disabled' : ''}`}>
// 	<a
// 		href='import'
// 		className="home-link"
// 		title="Import CSV Data"
// 		{...disabledAnchorProps}
// 	>
// 		<img
// 			src="./images/file-import-solid-full.svg"
// 			alt="Import"
// 			className="navbar-icon"
// 		/>
// 	</a>
// </div>
// <div className={`navbar-link${buttons.disabled ? ' disabled' : ''}`}>
// 	<a
// 		href='animation'
// 		className="home-link"
// 		title="Generate Eye Animation"
// 		{...disabledAnchorProps}
// 	>
// 		<img
// 			src="./images/eye-solid-full.svg"
// 			alt="Generate Eye Animation"
// 			className="navbar-icon"
// 		/>
// 	</a>
// </div>
// <div className={`navbar-link${buttons.disabled ? ' disabled' : ''}`}>
// 	<a
// 		href='side-by-side'
// 		className="home-link"
// 		title="Side-by-Side Viewer"
// 		{...disabledAnchorProps}
// 	>
// 		<img
// 			src="./images/file-video-solid-full.svg"
// 			alt="Side-by-Side Viewer"
// 			className="navbar-icon"
// 		/>
// 		<img
// 			src="./images/eye-solid-full.svg"
// 			alt="Side-by-Side Viewer"
// 			className="navbar-icon"
// 		/>
// 	</a>
// </div>
// <div className={`navbar-link${buttons.disabled ? ' disabled' : ''}`}>
// 	<a
// 		href='visualization'
// 		className="home-link"
// 		title="Visualization"
// 		{...disabledAnchorProps}
// 	>
// 		<img
// 			src="./images/eye-solid-full.svg"
// 			alt="Visualization"
// 			className="navbar-icon"
// 		/>
// 	</a>
// </div>