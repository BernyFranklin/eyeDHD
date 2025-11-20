import { useState, useRef } from "react";

export default function SidebySide() {
  const [vrFile, setVrFile] = useState("");
  const [animFile, setAnimFile] = useState("");
  const [offsetSeconds, setOffsetSeconds] = useState(0); //animation delay vs VR
  const [status, setStatus] = useState("");

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

   const clearSyncFiles = () => {
    if (vrVideoRef.current) {
      vrVideoRef.current.pause();
      vrVideoRef.current.currentTime = 0;
    }
    if (animVideoRef.current) {
      animVideoRef.current.pause();
      animVideoRef.current.currentTime = 0;
    }

    setVrFile(null);
    setAnimFile(null);
    setOffsetSeconds(0);
    setStatus("");
  };

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

    setStatus("Syncing with offset...");
    try {
      const outPath = await window.electron.video.SidebySide(
        vrFile,
        animFile,
        Number(offsetSeconds) || 0
      );
      setStatus(`Synced file saved at: ${outPath}`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <p><strong>Side by Side</strong></p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <button onClick={pickVr}>Select VR Video</button>
        <span style={{ fontSize: "0.8rem" }}>{vrFile || "No VR file selected"}</span>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <button onClick={pickAnim}>Select Animation Video</button>
        <span style={{ fontSize: "0.8rem" }}>{animFile || "No animation file selected"}</span>
      </div>

      {/*adjust offset before export */}
      <div style={{ margin: "0.5rem 0" }}>
        <label>
          Offset (seconds, animation delayed vs VR):{" "}
          <input
            type="number"
            step="0.1"
            value={offsetSeconds}
            onChange={(e) => setOffsetSeconds(e.target.value)}
            style={{ width: "5rem" }}
          />
        </label>
      </div>

      {/* side-by-side video preview */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          margin: "0.5rem 0",
          alignItems: "flex-start"
        }}
      >
        <div>
          <p style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>VR Video</p>
          <video
            ref={vrVideoRef}
            src={vrSrc}
            width={320}
            controls
            style={{ backgroundColor: "black" }}
          />
        </div>

        <div>
          <p style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Animation Video</p>
          <video
            ref={animVideoRef}
            src={animSrc}
            width={320}
            controls
            style={{ backgroundColor: "black" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        {/*just preview timing, no ffmpeg yet */}
        <button onClick={previewOffset}>Preview Offset Only</button>

        {/*actually export with ffmpeg */}
        <button onClick={syncVideos}>Create Synced Output</button>
        <button onClick={clearSyncFiles}>Clear Files</button>

      </div>

      {status && <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>{status}</p>}
    </div>
  );
}
