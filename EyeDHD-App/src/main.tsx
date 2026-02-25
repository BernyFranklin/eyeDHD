import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import './index.css';

import App from './App';
import CaseList from './components/CaseList';
import CsvFileImport from './components/CsvFileImport';
import AnimationGenerator from './components/AnimationGenerator';
import { Visualization } from './components/visualization';
import SidebySide from './components/SidebySide';
import CaseViewer from './components/CaseViewer';

const Main = () => {
	const [buttonsDisabled, setButtonsDisabled] = useState(false);

	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<App buttonsDisabled={buttonsDisabled} />}>
					<Route index element={<CaseList />} />
					<Route path='case' element={<CaseViewer />} />
					<Route path='import' element={
						<CsvFileImport
							buttonsDisabled={buttonsDisabled}
							setButtonsDisabled={setButtonsDisabled}
						/>
					} />
					<Route path='animation' element={
						<AnimationGenerator
							buttonsDisabled={buttonsDisabled}
							setButtonsDisabled={setButtonsDisabled}
						/>
					} />
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
