import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router';

import '@src/index.css';

import { store } from '@src/data';

import App from '@src/App';
import { Login, Home, CaseViewer } from '@src/pages';
// Old pages, functionality will be extracted into tasks for CaseViewer
// import CsvFileImport from './components/CsvFileImport';
// import AnimationGenerator from './components/AnimationGenerator';
// import Visualization from './components/Visualization';
// import SidebySide from './components/SidebySide';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path='/' element={
					<Provider store={store}>
						<App />
					</Provider>
				}>
					<Route index element={<Login />} />
					<Route path='home' element={<Home />} />
					<Route path='case' element={<CaseViewer />} />
				</Route>
			</Routes>
		</BrowserRouter>
	</StrictMode>
);
