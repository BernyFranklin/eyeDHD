import React from 'react';
import { Outlet } from 'react-router';

import './App.css';
import Navbar from './components/Navbar';

function App() {
	return (
		<>
			<Navbar />
			<Outlet />
		</>
	);
}

export default App;