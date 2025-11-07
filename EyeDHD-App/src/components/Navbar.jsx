const imgStyles = {
    width: '50px',
    color: 'white',
    filter: 'brightness(0) invert(1)',
}

export default function Navbar({ setCurrent }) {
    const handleHomeClick = () => {
        setCurrent(0);
    };

    return (
        <nav className="navbar">
            <span className="navbar-logo"><img className="navbar-logo-image" src="./images/fs-logo-white.png" alt="Logo" /></span>
            <span className="navbar-links">
                <a onClick={handleHomeClick} className="home-link">
                    <img src="./images/house-solid-full.svg" alt="Home" style={imgStyles} />
                </a>
            </span>
        </nav>
    );
}