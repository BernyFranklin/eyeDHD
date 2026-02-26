import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import './index.css';

import App from './App';
import CaseList from './components/CaseList';
import CsvFileImport from './components/CsvFileImport';
import AnimationGenerator from './components/AnimationGenerator';
import Visualization from './components/Visualization';
import SidebySide from './components/SidebySide';
import CaseViewer from './components/CaseViewer';

const Main = () => {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<App />}>
					<Route index element={<CaseList />} />
					<Route path='case' element={<CaseViewer />} />
					<Route path='import' element={<CsvFileImport /> } />
					<Route path='animation' element={<AnimationGenerator />} />
					<Route path='side-by-side' element={<SidebySide />} />
					<Route path='visualization' element={<Visualization />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<Main />
	</StrictMode>
);
