import React from 'react';

import { useSelector } from '../store/hooks';
import { selectDisabled } from '../store/features/buttons';

const imgStyles = {
	width: '50px',
	color: 'white',
	filter: 'brightness(0) invert(1)',
	marginTop: '5px'
};

const navbarStyles = {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	padding: '10px 20px'
};

const linkStyles = {
	backgroundColor: '#13284c',
	borderRadius: '10px',
	padding: '2px',
	display: 'inline-block',
	cursor: 'pointer'
};

const disabledLinkStyles = {
	backgroundColor: '#33486c',
	opacity: '0.8',
	borderRadius: '10px',
	padding: '2px',
	display: 'inline-block',
	cursor: 'not-allowed'
};

export default function Navbar() {
	const buttonsDisabled = useSelector(selectDisabled);

	return (
		<nav className="navbar" style={navbarStyles}>
			<span className="navbar-logo">
				<img className="navbar-logo-image" src="./images/fs-logo-white.png" alt="Logo" />
			</span>
			<span className="navbar-links">
				<div style={buttonsDisabled ? disabledLinkStyles : linkStyles}>
					<a href='/' className="home-link">
						<img src="./images/house-solid-full.svg" alt="Home" style={imgStyles} />
					</a>
				</div>
				<div style={buttonsDisabled ? disabledLinkStyles : linkStyles}>
					<a href='import' className="home-link">
						<img
						src="./images/file-import-solid-full.svg"
						alt="Import"
						style={imgStyles}
						/>
					</a>
				</div>
				<div style={buttonsDisabled ? disabledLinkStyles : linkStyles}>
					<a href='animation' className="home-link">
						<img
						src="./images/eye-solid-full.svg"
						alt="Generate Eye Animation"
						style={imgStyles}
						/>
					</a>
				</div>
				<div style={buttonsDisabled ? disabledLinkStyles : linkStyles}>
					<a href='side-by-side' className="home-link">
						<img
						src="./images/file-video-solid-full.svg"
						alt="Side-by-Side Viewer"
						style={imgStyles}
						/>
						<img
						src="./images/eye-solid-full.svg"
						alt="Side-by-Side Viewer"
						style={imgStyles}
						/>
					</a>
				</div>
				<div style={buttonsDisabled ? disabledLinkStyles : linkStyles}>
					<a href='visualization' className="home-link">
						<img
						src="./images/eye-solid-full.svg"
						alt="Visualization"
						style={imgStyles}
						/>
					</a>
				</div>
			</span>
		</nav>
	);
}