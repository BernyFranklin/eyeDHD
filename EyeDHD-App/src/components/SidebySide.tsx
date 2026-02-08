import { useState, useRef } from 'react';
import Button from './Button.js';

const electron = (window as any).electron;

export default function SidebySide() {
  const defaultStatus = 'Ready.';
  const [vrFile, setVrFile] = useState('');
  const [animFile, setAnimFile] = useState('');
  const [offsetSeconds, setOffsetSeconds] = useState(0); //animation delay vs VR
  const [status, setStatus] = useState(defaultStatus);
  const styles = {
    parent: {
      marginTop: '1rem',
      width: '80%',
      margin: '1rem auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textWrap: 'wrap'
    },
    headerContainer: {
      padding: '1rem',
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      margin: '1rem 1rem 0rem 1rem'
    },
    sideBySideContainer: {
      padding: '1rem',
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      width: 'calc(100% - 4rem)',
      margin: '1rem 1rem 0rem 1rem',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    offsetMenuContainer: {
      padding: '1rem',
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      width: 'calc(100% - 4rem)',
      margin: '1rem 1rem 1rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    elemContainer: {
      margin: '1rem'
    },
    videoContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      margin: '1rem',
      width: '50%'
    },
    buttonBarContainer: {
      width: '80%',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around'
    },
    button: {
      margin: '1rem',
      width: '20%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    textInput: {
      backgroundColor: '#fff',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '0.5rem',
      fontSize: '1rem',
      color: '#000'
    }
  };

  // Video player dimesnions height and width
  const vpw = 640;
  const vph = 480;
  // String var for offset
  const offsetStr = 'Offset (seconds, animation delayed vs VR):  ';

  const vrVideoRef = useRef<HTMLVideoElement>(null);
  const animVideoRef = useRef<HTMLVideoElement>(null);

  //turn OS path into a usable <video> src
  const vrSrc = vrFile ? electron.video.toVideoURL(vrFile) : null;
  const animSrc = animFile ? electron.video.toVideoURL(animFile) : null;

  const pickVr = async () => {
    const file = await electron.video.selectFile();
    if (file) setVrFile(file);
  };

  const pickAnim = async () => {
    const file = await electron.video.selectFile();
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
      const outPath = await electron.video.SidebySide(vrFile, animFile, numeric);
      setStatus(`Synced file saved at: ${outPath}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div id="parent-container" style={styles.parent as any}>
      <div id="title-header" style={styles.headerContainer}>
        <h3>Side by Side Tool</h3>
        <p>
          This tool aims to create a side by side video of the generated animation
          alongside the VR video captured during the experiment. Upload an animation video
          and its associated VR video, specify any offset in seconds (positive = animation
          delayed vs VR), and click "Create Synced Output" to generate a side by side
          video file.
        </p>
      </div>
      <div id="video-container" style={styles.sideBySideContainer as any}>
        <div id="left-video" style={styles.videoContainer as any}>
          <video
            ref={vrVideoRef}
            src={vrSrc}
            width={vpw}
            height={vph}
            controls
            style={{ backgroundColor: 'black', display: 'block' }}
          />
          <Button
            onClick={vrFile ? handleClearVr : pickVr}
            className="btn"
            buttonText={vrFile ? 'Clear VR Video' : 'Load VR Video'}
          />
        </div>
        <div id="right-video" style={styles.videoContainer as any}>
          <video
            ref={animVideoRef}
            src={animSrc}
            width={vpw}
            height={vph}
            controls
            style={{ backgroundColor: 'black', display: 'block' }}
          />
          <Button
            onClick={animFile ? handleClearAnim : pickAnim}
            className="btn"
            buttonText={animFile ? 'Clear Animation Video' : 'Load Animation Video'}
          />
        </div>
      </div>
      <div id="offset-menu" style={styles.offsetMenuContainer as any}>
        <div id="offset-input" style={styles.elemContainer}>
          <label>
            {offsetStr}
            <input
              id="offset-input-field"
              type="number"
              step="0.1"
              value={offsetSeconds}
              onChange={(e) => setOffsetSeconds(Number(e.target.value))}
              style={styles.textInput}
            />
          </label>
        </div>
        <div id="button-bar" style={styles.buttonBarContainer as any}>
          <div id="preview-button" style={styles.button as any}>
            <Button
              onClick={previewOffset}
              className="btn"
              buttonText="Preview Offset Only"
              disabled={isDisabled}
            />
          </div>
          <div id="export-sync-button" style={styles.button as any}>
            <Button
              onClick={syncVideos}
              className="btn"
              buttonText="Create Synced Output"
              disabled={isDisabled}
            />
          </div>
          <div id="clear-files-button" style={styles.button as any}>
            <Button onClick={clearSyncFiles} className="btn" buttonText="Clear Files" />
          </div>
        </div>
        <div id="status-message" style={styles.elemContainer}>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Status: </strong>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
