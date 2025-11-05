import Card from './Card';
import DoubleCard from './DoubleCard';

const homePageStyles = {
    display: 'flex',
    flexDirection: 'space-between',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
};

export default function HomePage() {
    return (
        <div>
            <h1>Welcome to EyeDHD</h1>
            <p>Your go-to application for eye movement data analysis and visualization.</p>
            <div style={homePageStyles}>
                <Card title="Import Raw CSV Data" img="../images/file-import-solid-full.svg" />
                <Card title="Generate Eye Animation" img="../images/eye-solid-full.svg" />
                <DoubleCard title="Side-by-side Viewer" img1="../images/file-video-solid-full.svg" img2="../images/eye-solid-full.svg" />
            </div>
        </div>
    );
}