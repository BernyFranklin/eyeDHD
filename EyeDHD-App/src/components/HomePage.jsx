import Card from './Card';
import DoubleCard from './DoubleCard';

const homePageStyles = {
    display: 'flex',
    flexDirection: 'space-between',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
};

export default function HomePage( { setCurrent }) {

    const handleImportClick = () => {
        setCurrent(1);
    };
    const handleGenerateEyeAnimationClick = () => {
        setCurrent(2);
    };
    const handleSideBySideViewerClick = () => {
        setCurrent(3);
    };

    return (
        <div>
            <h1>Welcome to EyeDHD</h1>
            <p>Your go-to application for eye movement data analysis and visualization.</p>
            <div style={homePageStyles}>
                <a className="card-link" onClick={handleImportClick}>
                    <Card title="Import Raw CSV Data" img="../images/file-import-solid-full.svg" />
                </a>
                <a className="card-link" onClick={handleGenerateEyeAnimationClick}>
                    <Card title="Generate Eye Animation" img="../images/eye-solid-full.svg" />
                </a>
                <a className="card-link" onClick={handleSideBySideViewerClick}>
                    <DoubleCard title="Side-by-side Viewer" img1="../images/file-video-solid-full.svg" img2="../images/eye-solid-full.svg" />
                </a>
            </div>
        </div>
    );
}