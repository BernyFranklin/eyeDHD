import React from 'react';
import { Outlet } from 'react-router';

import './App.css';
import Navbar from './components/Navbar';

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