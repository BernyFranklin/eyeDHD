export default function Navbar({ setCurrent }) {
    const handleHomeClick = () => {
        setCurrent(0);
    };
    const handleCleanDataClick = () => {
        setCurrent(1);
    };
    const handleGenerateEyeAnimationClick = () => {
        setCurrent(2);
    };
    const handleSideBySideViewerClick = () => {
        setCurrent(3);
    };

    return (
        <nav className="navbar">
            <span className="navbar-logo"><img className="navbar-logo-image" src="./images/fs-logo-white.png" alt="Logo" /></span>
            <span className="navbar-links">
                <a onClick={handleHomeClick}>Home</a> | 
                <a onClick={handleCleanDataClick}>Clean Data</a> | 
                <a onClick={handleGenerateEyeAnimationClick}>Generate Eye Animation</a> |
                <a onClick={handleSideBySideViewerClick}>Side-by-side Viewer</a>
            </span>
        </nav>
    );
}