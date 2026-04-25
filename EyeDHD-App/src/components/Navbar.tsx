import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Menu, Minus, Maximize2, Minimize2, X } from 'lucide-react';

import { useSelector, useDispatch } from '@src/data/hooks';
import { selectButtons } from '@src/data/features/global';
import { setProjectDir, setProjectInitialized } from '@src/data/features/user';

const disabledLinkProps = {
	onClick: (e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault(),
	'aria-disabled': true,
	tabIndex: -1
};

type MenuItemDef =
	| { type: 'separator' }
	| { label: string; action: string; accelerator?: string };

type MenuDef = { label: string; items: MenuItemDef[] };

const APP_MENUS: MenuDef[] = [
	{
		label: 'File',
		items: [
			{ label: 'Select Project Folder', action: 'select-project' },
			{ type: 'separator' },
			{ label: 'Quit', action: 'quit' }
		]
	},
	{
		label: 'Edit',
		items: [
			{ label: 'Undo', action: 'undo', accelerator: 'Ctrl+Z' },
			{ label: 'Redo', action: 'redo', accelerator: 'Ctrl+Y' },
			{ type: 'separator' },
			{ label: 'Cut', action: 'cut', accelerator: 'Ctrl+X' },
			{ label: 'Copy', action: 'copy', accelerator: 'Ctrl+C' },
			{ label: 'Paste', action: 'paste', accelerator: 'Ctrl+V' },
			{ type: 'separator' },
			{ label: 'Select All', action: 'select-all', accelerator: 'Ctrl+A' }
		]
	},
	{
		label: 'View',
		items: [
			{ label: 'Reload', action: 'reload', accelerator: 'Ctrl+R' },
			{ label: 'Force Reload', action: 'force-reload', accelerator: 'Ctrl+Shift+R' },
			{ label: 'Toggle Developer Tools', action: 'toggle-devtools', accelerator: 'Ctrl+Shift+I' },
			{ type: 'separator' },
			{ label: 'Actual Size', action: 'actual-size', accelerator: 'Ctrl+0' },
			{ label: 'Zoom In', action: 'zoom-in', accelerator: 'Ctrl+=' },
			{ label: 'Zoom Out', action: 'zoom-out', accelerator: 'Ctrl+-' },
			{ type: 'separator' },
			{ label: 'Toggle Full Screen', action: 'toggle-fullscreen', accelerator: 'F11' }
		]
	},
	{
		label: 'Window',
		items: [
			{ label: 'Minimize', action: 'window-minimize' },
			{ label: 'Maximize', action: 'window-maximize' },
			{ label: 'Close', action: 'window-close' }
		]
	},
	{
		label: 'Help',
		items: [
			{ label: 'About EyeDHD', action: 'about' }
		]
	}
];

function AppMenu({ onAction }: { onAction: (action: string) => void }) {
	const [menuBarOpen, setMenuBarOpen] = useState(false);
	const [menuBarClosing, setMenuBarClosing] = useState(false);
	const [openMenu, setOpenMenu] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => () => {
		if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
	}, []);

	const openMenuBar = () => {
		if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
		setMenuBarClosing(false);
		setMenuBarOpen(true);
	};

	const closeMenuBar = () => {
		setOpenMenu(null);
		setMenuBarClosing(true);
		closeTimerRef.current = setTimeout(() => {
			setMenuBarOpen(false);
			setMenuBarClosing(false);
			closeTimerRef.current = null;
		}, 180);
	};

	useEffect(() => {
		if (!menuBarOpen) return;
		const onClickOutside = (e: MouseEvent) => {
			if (!containerRef.current?.contains(e.target as Node)) closeMenuBar();
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { openMenu ? setOpenMenu(null) : closeMenuBar(); }
		};
		document.addEventListener('mousedown', onClickOutside);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onClickOutside);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [menuBarOpen, openMenu]);

	const handleAction = (action: string) => {
		setOpenMenu(null);
		closeMenuBar();
		onAction(action);
	};

	return (
		<div className="app-menu-container" ref={containerRef}>
			<button
				className={`app-menu-toggle${menuBarOpen ? ' active' : ''}`}
				title="Application Menu"
				onClick={() => menuBarOpen && !menuBarClosing ? closeMenuBar() : openMenuBar()}
			>
				<Menu size={25} />
			</button>
			{menuBarOpen && (
				<div className={`app-menu${menuBarClosing ? ' closing' : ''}`}>
					{APP_MENUS.map((menu) => (
						<div key={menu.label} className="app-menu-entry">
							<button
								className={`app-menu-btn${openMenu === menu.label ? ' active' : ''}`}
								onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
								onMouseEnter={() => { if (openMenu && openMenu !== menu.label) setOpenMenu(menu.label); }}
							>
								{menu.label}
							</button>
							{openMenu === menu.label && (
								<div className="app-menu-dropdown">
									{menu.items.map((item, i) =>
										'type' in item ? (
											<div key={i} className="app-menu-separator" />
										) : (
											<button
												key={item.action}
												className="app-menu-item"
												onClick={() => handleAction(item.action)}
											>
												<span>{item.label}</span>
												{item.accelerator && (
													<span className="app-menu-accel">{item.accelerator}</span>
												)}
											</button>
										)
									)}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function WindowControls() {
	const [isMaximized, setIsMaximized] = useState(false);

	useEffect(() => {
		window.electron.window.isMaximized().then(setIsMaximized);
		const handler = (maximized: boolean) => setIsMaximized(maximized);
		window.electron.window.onMaximizeChange(handler);
		return () => window.electron.window.offMaximizeChange(handler);
	}, []);

	return (
		<span className="window-controls">
			<button
				className="window-btn"
				title="Minimize"
				onClick={() => window.electron.window.minimize()}
			>
				<Minus size={25} />
			</button>
			<button
				className="window-btn"
				title={isMaximized ? 'Restore' : 'Maximize'}
				onClick={() => window.electron.window.maximize()}
			>
				{isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
			</button>
			<button
				className="window-btn close-btn"
				title="Close"
				onClick={() => window.electron.window.close()}
			>
				<X size={25} />
			</button>
		</span>
	);
}

export default function Navbar() {
	const buttons = useSelector(selectButtons);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const disabledAnchorProps = buttons.disabled ? disabledLinkProps : {};

	const handleMenuAction = (action: string) => {
		if (action === 'select-project') {
			dispatch(setProjectDir(null));
			dispatch(setProjectInitialized(false));
			navigate('/');
			return;
		}
		window.electron.menu.action(action);
	};

	return (
		<nav className="navbar">
			<span className="navbar-left">
				<span className="navbar-logo">
					<img
						className="navbar-logo-fs"
						src="./images/fs-logo-white.png"
						alt="Logo"
					/>
					<span className="navbar-links">
						<div className={`navbar-link`}>
							<img
								className="navbar-logo-sight"
								src="./images/sight-logo-transparent.png"
								alt="SIGHT Logo"
							/>
						</div>
						<div className={`navbar-link${buttons.disabled ? ' disabled' : ''}`}>
							<Link
								to='/home'
								className="home-link"
								title="Home"
								{...disabledAnchorProps}
							>
								<img
									src="./images/house-solid-full.svg"
									alt="Home"
									className="navbar-icon"
								/>
							</Link>
						</div>
					</span>
				</span>
				<AppMenu onAction={handleMenuAction} />
			</span>
			<span className="navbar-right">
				<WindowControls />
			</span>
			<style>{`
				:root {
					--navbar-height: 60px;
				}

				.navbar {
					background-color: #b1102b;
					margin: 0;
					height: var(--navbar-height);
					padding: 0 0 0 20px;
					display: flex;
					align-items: center;
					justify-content: space-between;
					-webkit-app-region: drag;
					position: relative;
					z-index: 50;
				}

				.navbar-left {
					display: flex;
					align-items: center;
					gap: 4px;
					height: 100%;
				}

				.navbar-right {
					display: flex;
					align-items: center;
					height: 100%;
					gap: 12px;
					padding-right: 0;
				}

				.navbar-logo {
					display: flex;
					align-items: center;
					gap: 10px;
					padding-right: 8px;
				}

				.navbar-logo-sight {
					height: 40px;
					border-radius: var(--action-radius);
					filter: invert(100%)
				}

				.navbar-logo-fs {
					height: 50px;
					border-radius: var(--action-radius);
				}

				.navbar-icon {
					width: 26px;
					height: 26px;
					color: white;
					filter: brightness(0) invert(1);
					margin: 0;
					display: block;
				}

				/* App menu */

				@keyframes menuSlideIn {
					from { opacity: 0; transform: translateX(-10px); }
					to   { opacity: 1; transform: translateX(0); }
				}

				@keyframes menuSlideOut {
					from { opacity: 1; transform: translateX(0); }
					to   { opacity: 0; transform: translateX(-10px); }
				}

				.app-menu-container {
					display: flex;
					align-items: center;
					height: 100%;
					margin-left: 5px;
					-webkit-app-region: no-drag;
				}

				.app-menu-toggle {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 40px;
					height: 40px;
					background-color: var(--action-bg);
					border: none;
					border-radius: var(--action-radius);
					color: var(--action-text);
					cursor: pointer;
					transition: background-color 0.3s ease;
					flex-shrink: 0;
				}

				.app-menu-toggle:hover,
				.app-menu-toggle.active {
					background-color: var(--action-bg-hover);
				}

				.app-menu {
					display: flex;
					align-items: center;
					height: 100%;
					margin-left: 15px;
					gap: 2px;
					animation: menuSlideIn 0.2s ease forwards;
				}

				.app-menu.closing {
					animation: menuSlideOut 0.18s ease forwards;
				}

				.app-menu-entry {
					position: relative;
					display: flex;
					align-items: center;
					height: 100%;
				}

				.app-menu-btn {
					background: transparent;
					border: none;
					border-radius: var(--action-radius);
					color: rgba(255, 255, 255, 0.9);
					font-size: 0.85rem;
					font-family: inherit;
					padding: 0 12px;
					height: 40px;
					cursor: pointer;
					transition: background-color 0.15s ease;
					white-space: nowrap;
				}

				.app-menu-btn:hover,
				.app-menu-btn.active {
					background-color: rgba(0, 0, 0, 0.25);
					color: #fff;
				}

				.app-menu-dropdown {
					position: absolute;
					top: 100%;
					left: 0;
					min-width: 220px;
					background-color: #2b2b2b;
					border: 1px solid rgba(255, 255, 255, 0.1);
					border-top: none;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
					z-index: 1000;
					padding: 4px 0;
				}

				.app-menu-item {
					display: flex;
					justify-content: space-between;
					align-items: center;
					width: 100%;
					background: transparent;
					border: none;
					color: rgba(255, 255, 255, 0.9);
					font-size: 0.85rem;
					font-family: inherit;
					padding: 6px 16px;
					cursor: pointer;
					text-align: left;
					gap: 32px;
				}

				.app-menu-item:hover {
					background-color: #13284c;
					color: #fff;
				}

				.app-menu-accel {
					color: rgba(255, 255, 255, 0.45);
					font-size: 0.78rem;
					white-space: nowrap;
				}

				.app-menu-separator {
					height: 1px;
					background-color: rgba(255, 255, 255, 0.12);
					margin: 4px 0;
				}

				/* Nav links / home button */

				.navbar-links {
					display: flex;
					gap: 15px;
					-webkit-app-region: no-drag;
				}

				.navbar-links a {
					color: var(--action-text);
					text-decoration: none;
					font-weight: 600;
					display: flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100%;
				}

				.navbar-links a:hover {
					text-decoration: underline;
				}

				.navbar-links a[aria-disabled='true'] {
					cursor: not-allowed;
					opacity: 0.8;
					text-decoration: none;
					pointer-events: none;
				}

				.navbar-links a[aria-disabled='true']:hover {
					text-decoration: none;
				}

				.navbar-link {
					background-color: var(--action-bg);
					border-radius: var(--action-radius);
					padding: 0;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					transition: background-color 0.3s ease;
					width: 40px;
					height: 40px;
				}

				.navbar-link:hover {
					background-color: var(--action-bg-hover);
				}

				.navbar-link.disabled {
					background-color: var(--action-bg-disabled);
					opacity: 0.8;
					cursor: not-allowed;
				}

				.navbar-link.disabled:hover {
					background-color: var(--action-bg-disabled);
				}

				.home-link:hover {
					transform: translateX(-2px);
					transition: transform 0.3s ease-in-out;
				}

				/* Window controls */

				.window-controls {
					display: flex;
					align-items: center;
					height: var(--navbar-height);
					gap: 6px;
					padding: 0 12px;
					-webkit-app-region: no-drag;
				}

				.window-btn {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 40px;
					height: 40px;
					background: transparent;
					border: none;
					border-radius: var(--action-radius);
					color: rgba(255, 255, 255, 0.85);
					cursor: pointer;
					transition: background-color 0.15s ease;
					padding: 0;
					flex-shrink: 0;
				}

				.window-btn:hover {
					background-color: rgba(255, 255, 255, 0.15);
					color: #fff;
				}

				.close-btn:hover {
					background-color: #c42b1c;
					color: #fff;
				}
			`}</style>
		</nav>
	);
}