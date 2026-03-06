import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router';

import { Login, Home, Processing } from '@src/pages';

import { store } from '@src/data';

import App from '@src/App';
import '@src/index.css';

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
					<Route path='processing' element={<Processing />} />
				</Route>
			</Routes>
		</BrowserRouter>
	</StrictMode>
);