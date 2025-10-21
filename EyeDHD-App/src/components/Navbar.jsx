export default function Navbar() {
    return (
        <nav className="navbar">
            <span className="navbar-logo"><img className="navbar-logo-image" src="./images/fs-logo-white.png" alt="Logo" /></span>
            <span className="navbar-links">
                <a href="#">Home</a> | 
                <a href="#">Upload</a> | 
                <a href="#">Contact</a>
            </span>
        </nav>
    );
}