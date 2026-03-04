import React, { useState, useRef } from 'react';
import Button from '@src/components/Button';

export default function SidebySide() {
	const defaultStatus = 'Ready.';
	const [vrFile, setVrFile] = useState('');
	const [animFile, setAnimFile] = useState('');
	const [offsetSeconds, setOffsetSeconds] = useState(0); //animation delay vs VR
	const [status, setStatus] = useState(defaultStatus);

	// Video player dimesnions height and width
	const vpw = 640;
	const vph = 480;
	// String var for offset
	const offsetStr = 'Offset (seconds, animation delayed vs VR):  ';

	const vrVideoRef = useRef<HTMLVideoElement>(null);
	const animVideoRef = useRef<HTMLVideoElement>(null);

	//turn OS path into a usable <video> src
	const vrSrc = vrFile ? window.electron.video.toVideoURL(vrFile) : null;
	const animSrc = animFile ? window.electron.video.toVideoURL(animFile) : null;

	const pickVr = async () => {
		const file = await window.electron.video.selectFile();
		if (file) setVrFile(file);
	};

	const pickAnim = async () => {
		const file = await window.electron.video.selectFile();
		if (file) setAnimFile(file);
	};

	const handleClearVr = () => {
		setVrFile('');
		// Force the video element to clear its content
		if (vrVideoRef.current) {
			vrVideoRef.current.pause();
			vrVideoRef.current.removeAttribute('src');
			vrVideoRef.current.load(); // This forces the video to reset
		}
	};

	const handleClearAnim = () => {
		setAnimFile('');
		// Force the video element to clear its content
		if (animVideoRef.current) {
			animVideoRef.current.pause();
			animVideoRef.current.removeAttribute('src');
			animVideoRef.current.load(); // This forces the video to reset
		}
	};

	const clearSyncFiles = () => {
		handleClearVr();
		handleClearAnim();
		setOffsetSeconds(0);
		setStatus(defaultStatus);
	};

	const isDisabled = !vrFile || !animFile;

	// preview timing in the player BEFORE calling ffmpeg
	const previewOffset = () => {
		if (!vrVideoRef.current || !animVideoRef.current) {
			setStatus('Load both VR + animation first.');
			return;
		}

		const vr = vrVideoRef.current;
		const anim = animVideoRef.current;
		const off = Number(offsetSeconds) || 0;

		// pause + reset both
		vr.pause();
		anim.pause();
		vr.currentTime = 0;
		anim.currentTime = 0;

		// positive offset = animation starts later than VR
		if (off >= 0) {
			vr.play();
			setTimeout(() => {
				anim.play();
			}, off * 1000);
		} else {
			// negative offset = animation leads, VR starts later
			const delay = Math.abs(off);
			anim.play();
			setTimeout(() => {
				vr.play();
			}, delay * 1000);
		}

		if (off > 0) {
			setStatus(`Previewing with offset of ${off.toFixed(2)}s (animation delayed).`);
		} else if (off < 0) {
			setStatus(`Previewing with offset of ${off.toFixed(2)}s (user view delayed).`);
		} else if (off === 0) {
			setStatus(`Previewing with offset of ${off.toFixed(2)}s.`);
		}
	};

	const syncVideos = async () => {
		if (!vrFile || !animFile) {
			setStatus('Select both VR + animation first.');
			return;
		}
		// comment(jaz): log raw + numeric offset from ui
		console.log('react offsetSeconds state =', offsetSeconds);
		const numeric = Number(offsetSeconds);
		console.log('react numeric offset =', numeric);

		setStatus('Syncing with offset...');
		try {
			const outPath = await window.electron.video.SidebySide(vrFile, animFile, numeric);
			setStatus(`Synced file saved at: ${outPath}`);
		} catch (err: any) {
			setStatus(`Error: ${err.message}`);
		}
	};

	return (
		<div id="parent-container" className="side-by-side">
			<div id="title-header" className="side-by-side__header">
				<h3>Side by Side Tool</h3>
				<p>
					This tool aims to create a side by side video of the generated animation
					alongside the VR video captured during the experiment. Upload an animation video
					and its associated VR video, specify any offset in seconds (positive = animation
					delayed vs VR), and click "Create Synced Output" to generate a side by side
					video file.
				</p>
			</div>
			<div id="video-container" className="side-by-side__videos">
				<div id="left-video" className="side-by-side__video">
					<video
						ref={vrVideoRef}
						src={vrSrc}
						width={vpw}
						height={vph}
						controls
						className="side-by-side__video-player"
					/>
					<Button
						onClick={vrFile ? handleClearVr : pickVr}
					>
						{vrFile ? 'Clear VR Video' : 'Load VR Video'}
					</Button>
				</div>
				<div id="right-video" className="side-by-side__video">
					<video
						ref={animVideoRef}
						src={animSrc}
						width={vpw}
						height={vph}
						controls
						className="side-by-side__video-player"
					/>
					<Button
						onClick={animFile ? handleClearAnim : pickAnim}
					>
						{animFile ? 'Clear Animation Video' : 'Load Animation Video'}
					</Button>
				</div>
			</div>
			<div id="offset-menu" className="side-by-side__offset">
				<div id="offset-input" className="side-by-side__section">
					<label>
						{offsetStr}
						<input
							id="offset-input-field"
							type="number"
							step="0.1"
							value={offsetSeconds}
							onChange={(e) => setOffsetSeconds(Number(e.target.value))}
							className="side-by-side__input"
						/>
					</label>
				</div>
				<div id="button-bar" className="side-by-side__button-bar">
					<div id="preview-button" className="side-by-side__button-cell">
						<Button
							onClick={previewOffset}
							disabled={isDisabled}
						>
							Preview Offset Only
						</Button>
					</div>
					<div id="export-sync-button" className="side-by-side__button-cell">
						<Button
							onClick={syncVideos}
							disabled={isDisabled}
						>
							Create Synced Output
						</Button>
					</div>
					<div id="clear-files-button" className="side-by-side__button-cell">
						<Button onClick={clearSyncFiles}>
							Clear Files
						</Button>
					</div>
				</div>
				<div id="status-message" className="side-by-side__section">
					<p className="side-by-side__status">
						<strong>Status: </strong>
						{status}
					</p>
				</div>
				<style>{`
					.side-by-side {
						margin-top: 1rem;
						width: 80%;
						margin: 1rem auto;
						display: flex;
						flex-direction: column;
						align-items: center;
						text-wrap: wrap;
					}

					.side-by-side__header {
						padding: 1rem;
						border: 1px solid #ccc;
						border-radius: 8px;
						background-color: #f8f9fa;
						margin: 1rem 1rem 0rem 1rem;
					}

					.side-by-side__videos {
						padding: 1rem;
						border: 1px solid #ccc;
						border-radius: 8px;
						background-color: #f8f9fa;
						width: calc(100% - 4rem);
						margin: 1rem 1rem 0rem 1rem;
						display: flex;
						flex-direction: row;
						justify-content: space-between;
					}

					.side-by-side__offset {
						padding: 1rem;
						border: 1px solid #ccc;
						border-radius: 8px;
						background-color: #f8f9fa;
						width: calc(100% - 4rem);
						margin: 1rem 1rem 1rem 1rem;
						display: flex;
						flex-direction: column;
						align-items: center;
					}

					.side-by-side__section {
						margin: 1rem;
					}

					.side-by-side__video {
						display: flex;
						flex-direction: column;
						align-items: center;
						margin: 1rem;
						width: 50%;
					}

					.side-by-side__button-bar {
						width: 80%;
						display: flex;
						flex-direction: row;
						justify-content: space-around;
					}

					.side-by-side__button-cell {
						margin: 1rem;
						width: 20%;
						display: flex;
						flex-direction: column;
						align-items: center;
					}

					.side-by-side__input {
						background-color: #fff;
						border: 1px solid #ccc;
						border-radius: 4px;
						padding: 0.5rem;
						font-size: 1rem;
						color: #000;
					}

					.side-by-side__video-player {
						background-color: black;
						display: block;
					}

					.side-by-side__status {
						margin-top: 0.5rem;
					}
				`}</style>
			</div>
		</div>
	);
}
