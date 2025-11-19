import AnimationWindow from "./AnimationWindow";
import Button from "./Button";

export default function AnimationContainer({ csvData, loadMoreRows, isPlaying, setIsPlaying }) {
    
    return (
        <div className="animation-window-container">
            <AnimationWindow csvData={csvData} loadMoreRows={loadMoreRows} isPlaying={isPlaying} />
            <div className="animation-controls">
                <Button onClick={() => setIsPlaying(!isPlaying)} className="btn" buttonText={isPlaying ? "Pause Animation" : "Play Animation"} />
            </div>
        </div>
    )
}