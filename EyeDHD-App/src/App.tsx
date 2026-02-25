import React, { useEffect, useMemo, useState } from 'react';

import './App.css';
import HomePage from './components/HomePage';
import CsvFileImport from './components/CsvFileImport';
import AnimationGenerator from './components/AnimationGenerator';
import { Visualization } from './components/visualization';
import LoadingOverlay from './components/LoadingOverlay';
import Navbar from './components/Navbar';
import SidebySide from './components/SidebySide';
import CaseList from './components/CaseList';
import { BrowserRouter, Outlet } from 'react-router';

type Props = {
	buttonsDisabled: boolean
}

function App(props: Props) {
	return (
		<>
			<Navbar
				buttonsDisabled={props.buttonsDisabled}
			/>
			<Outlet />
		</>
	);
}

export default App;