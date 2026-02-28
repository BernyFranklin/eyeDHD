import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import './index.css';

import App from './App';
import HomePage from './components/NewHomePage';
import CaseViewer from './components/CaseViewer';
// Old pages, functionality will be extracted into tasks for CaseViewer
// import CsvFileImport from './components/CsvFileImport';
// import AnimationGenerator from './components/AnimationGenerator';
// import Visualization from './components/Visualization';
// import SidebySide from './components/SidebySide';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<App />}>
					<Route index element={<HomePage />} />
					<Route path='case' element={<CaseViewer />} />
				</Route>
			</Routes>
		</BrowserRouter>
	</StrictMode>
);
