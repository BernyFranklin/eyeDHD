import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router';

import '@src/index.css';

import { store } from '@src/data';

import App from '@src/App';
import { Login, Home, Processing } from '@src/pages';

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
