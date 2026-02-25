import React from 'react';

import './App.css';
import Navbar from './components/Navbar';
import { Outlet } from 'react-router';

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