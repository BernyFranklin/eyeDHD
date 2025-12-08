import { useState, useRef } from "react";
import Button from "./Button.jsx";

export default function SidebySide() {
  const [vrFile, setVrFile] = useState("");
  const [animFile, setAnimFile] = useState("");
  const [offsetSeconds, setOffsetSeconds] = useState(0); //animation delay vs VR
  const [status, setStatus] = useState("Placeholder status messages here.");

  const styles = {
    parent: {
      marginTop: "1rem",
      width: "80%",
      margin: "1rem auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      border: "1px solid #ccc",
      textWrap: "wrap"
    },
    childOne: {
      border: "1px dashed red",
      margin: "1rem 1rem 0rem 1rem",
    },
    childTwo: {
      border: "1px dashed red",
      width: "calc(100% - 2rem)",
      margin: "1rem 1rem 0rem 1rem",
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',

    },
    childThree: {
      border: "1px dashed red",
      width: "calc(100% - 2rem)",
      margin: "1rem 1rem 1rem 1rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    },
    childFour: {
      border: "1px dashed red",
      margin: "1rem"
    },
    middleGrandchild: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      border: "1px dotted green",
      margin: "1rem",
      width: "50%"
    },
    grandchildThreeTop: {
      border: "1px dotted green",
      margin: "1rem"
    },
    grandchildThreeBottom: {
      border: "1px dotted green",
      width: "80%",
      margin: "1rem",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-around",
    },
    button: {
      border: "1px solid blue",
      margin: "1rem",
      width: "20%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    },
    textInput: {
      backgroundColor: "#fff",
      border: "1px solid #ccc",
      borderRadius: "4px",
      padding: "0.5rem",
      fontSize: "1rem",
      color: "#000",
    }
  }

  // Video player dimesnions height and width
  const vpw = 640;
  const vph = 480;
  // String var for offset
  const offsetStr = "Offset (seconds, animation delayed vs VR):  ";

  const vrVideoRef = useRef(null);
  const animVideoRef = useRef(null);

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
    setVrFile(null);
    // Force the video element to clear its content
    if (vrVideoRef.current) {
      vrVideoRef.current.pause();
      vrVideoRef.current.removeAttribute('src');
      vrVideoRef.current.load(); // This forces the video to reset
    }
  }

  const handleClearAnim = () => {
    setAnimFile(null);
    // Force the video element to clear its content
    if (animVideoRef.current) {
      animVideoRef.current.pause();
      animVideoRef.current.removeAttribute('src');
      animVideoRef.current.load(); // This forces the video to reset
    }
  }

  const clearSyncFiles = () => {
    
    handleClearVr();
    handleClearAnim();
    setOffsetSeconds(0);
    setStatus("");
  };

  const isDisabled = !vrFile || !animFile;

  // preview timing in the player BEFORE calling ffmpeg
  const previewOffset = () => {
    if (!vrVideoRef.current || !animVideoRef.current) {
      setStatus("Load both VR + animation first.");
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

    setStatus(`Previewing with offset ${off.toFixed(2)}s (animation vs VR).`);
  };

  const syncVideos = async () => {
    if (!vrFile || !animFile) {
      setStatus("Select both VR + animation first.");
      return;
    }
    // comment(jaz): log raw + numeric offset from ui
    console.log("react offsetSeconds state =", offsetSeconds);
    const numeric = Number(offsetSeconds);
    console.log("react numeric offset =", numeric);

    setStatus("Syncing with offset...");
    try {
      const outPath = await window.electron.video.SidebySide(
        vrFile,
        animFile,
        numeric
      );
      setStatus(`Synced file saved at: ${outPath}`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div id="parent-container" style={styles.parent}>
      <div id="title-header" style={styles.childOne}>
        <h3>Side by Side Tool</h3>
        <p>
          This tool aims to create a side by side video of the generated animation alongside the VR video captured during the experiment. Upload an animation video and its associated VR video, specify any offset in seconds (positive = animation delayed vs VR), and click "Create Synced Output" to generate a side by side video file.
        </p>
      </div>
      <div id="video-container" style={styles.childTwo}>
        <div id="left-video" style ={styles.middleGrandchild}>
          <video
            ref={vrVideoRef}
            src={vrSrc}
            width={vpw}
            height={vph}
            controls
            style={{ backgroundColor: "black", display: "block" }}
          />
          <Button onClick={vrFile ? handleClearVr : pickVr} className="btn" buttonText={vrFile ? "Clear VR Video" : "Load VR Video"} />
        </div>
        <div id="right-video" style={styles.middleGrandchild}>
          <video
            ref={animVideoRef}
            src={animSrc}
            width={vpw}
            height={vph}
            controls
            style={{ backgroundColor: "black", display: "block" }}
          />
          <Button onClick={animFile ? handleClearAnim : pickAnim} className="btn" buttonText={animFile ? "Clear Animation Video" : "Load Animation Video"} />
        </div>
      </div>
      <div id="offset-menu" style={styles.childThree}>
          <div id="offset-input" style={styles.grandchildThreeTop}>
            <label>
              {offsetStr}
              <input
                id="offset-input-field"
                type="number"
                step="0.1"
                value={offsetSeconds}
                onChange={(e) => setOffsetSeconds(e.target.value)}
                style={styles.textInput}
              />
            </label>
          </div>
          <div id="button-bar" style={styles.grandchildThreeBottom}>
            <div id="preview-button" style={styles.button}>
              <Button onClick={previewOffset} className="btn" buttonText="Preview Offset Only" disabled={isDisabled} />
            </div>
            <div id="export-sync-button" style={styles.button}>
              <Button onClick={syncVideos} className="btn" buttonText="Create Synced Output" disabled={isDisabled} />
            </div>
            <div id="clear-files-button" style={styles.button}>
              <Button onClick={clearSyncFiles} className="btn" buttonText="Clear Files" />
            </div>
          </div>
      </div>
      <div id="status-message" style={styles.childFour}>
        {status && <p style={{ marginTop: "0.5rem" }}>{status}</p>}
      </div>
    </div>
  );

}