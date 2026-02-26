import React from 'react';
import { Provider } from 'react-redux';
import { Outlet } from 'react-router';

import { store } from './store';

import './App.css';
import Navbar from './components/Navbar';

function App() {
	return (
		<>
			<Provider store={store}>
				<Navbar />
				<Outlet />
			</Provider>
		</>
	);
}

export default App;