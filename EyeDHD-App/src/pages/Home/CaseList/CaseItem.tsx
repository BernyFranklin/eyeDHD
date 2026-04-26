import React, { useEffect, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';

import { type CaseData } from '@src/data/types';

type Props = {
	file: CaseData,
	onClick: (file: CaseData) => void,
	onUpdate: (file: CaseData) => void,
	onRemove: (file: CaseData) => void
};

/**
 * Component for displaying a single case in the case list, shows case name and
 * an options button. Clicking on the case name calls onClick
 * callback with the case data so the case list knows which item to select.
 */
export default function Case(props: Props) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!menuOpen) return;
		const onDocClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, [menuOpen]);

	const handleUpdate = () => {
		setMenuOpen(false);
		props.onUpdate(props.file);
	};

	const handleRemove = () => {
		setMenuOpen(false);
		props.onRemove(props.file);
	};

	return (
		<>
			<div className='case-item'>
				<a
					onClick={(event) => {
						event.preventDefault();
						props.onClick(props.file);
					}}
				>
					{props.file.name}
				</a>
				<div className='case-options-wrapper' ref={menuRef}>
					<div
						className='case-options'
						onClick={(event) => {
							event.stopPropagation();
							setMenuOpen((open) => !open);
						}}
					>
						<Ellipsis size={20} strokeWidth={1.5}  />
					</div>
					{menuOpen && (
						<div className='case-options-menu' role='menu'>
							<button type='button' onClick={handleUpdate}>Update</button>
							<button type='button' onClick={handleRemove}>Remove</button>
							<button type='button' onClick={() => setMenuOpen(false)}>Cancel</button>
						</div>
					)}
				</div>
			</div>
			<style>{`
				.case-item {
					background: #FFFFFF;
					color: #A0A0A0;
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 5px 7px;
					width: 200px;
					border: 1px solid #ccc;
					border-radius: var(--action-radius);
					margin-bottom: 10px;
					transition: background-color 0.2s ease;
				}

				.case-item a {
					cursor: pointer;
					text-decoration: none;
					color: #333;
					font-size: 16px;
					font-weight: 500;
					padding-left: 5px;
				}

				.case-options-wrapper {
					position: relative;
					margin-left: auto;
				}

				.case-options {
					color: black;
					margin: 0;
					padding-right: 5px;
					padding-top: 7px;
					cursor: pointer;
					user-select: none;
				}

				.case-options-menu {
					position: absolute;
					right: 0;
					bottom: calc(100% + 4px);
					background: #fff;
					border: 1px solid #ccc;
					border-radius: var(--action-radius);
					box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
					display: flex;
					flex-direction: column;
					min-width: 110px;
					z-index: 10;
					overflow: hidden;
				}

				.case-options-menu button {
					background: none;
					border: none;
					text-align: left;
					padding: 8px 12px;
					cursor: pointer;
					font: inherit;
					color: #333;
				}

				.case-options-menu button:hover {
					background: #f0f0f0;
				}
			`}</style>
		</>
	);
}
