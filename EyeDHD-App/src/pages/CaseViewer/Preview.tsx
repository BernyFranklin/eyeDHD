import React from 'react';

export default function Preview() {
	return (
		<>
			<div className='preview-window'>

			</div>
			<style>
				{`
					.preview-window {
						border: 1px solid black;
						border-radius: 5px;
						width: 100%;
						height: 100%;
						background: rgba(200, 200, 200, 0.8);
					}
				`}
			</style>
		</>
	)
}