import React from 'react';
import { Provider } from 'react-redux';
import { Outlet } from 'react-router';

import { store } from './store';

import './App.css';
import Navbar from './components/Navbar';
import AlertWindow from './components/AlertWindow';

function App() {
	return (
		<>
			<Provider store={store}>
				<Navbar />
				<AlertWindow />
				<main className="app-content">
					<Outlet />
				</main>
			</Provider>
		</>
	);
}

export default App;