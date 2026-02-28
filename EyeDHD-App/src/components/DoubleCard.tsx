import React from 'react';



type Props = {
	title: string;
	img1: string;
	img2: string;
	className: string;
};

export default function DoubleCard({ title, img1, img2, className }: Props) {
	return (
		<div className={`card card-double ${className ?? ''}`}>
			<p>{title}</p>
			<div className="card-double-images">
				<img src={img1} alt={title} className="card-image" />
				<img src={img2} alt={title} className="card-image" />
			</div>
			<style>{`
				.card.card-double {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					width: 300px;
					height: 250px;
					background-color: #13284c;
					color: #fff;
					font-weight: bold;
					border-radius: 10%;
					box-shadow: 0 4px 8px rgba(0, 0, 0, 0.9);
					margin: 20px;
					padding: 10px;
				}

				.card-double-images {
					display: inline-block;
				}

				.card-image {
					width: 100px;
					color: white;
					filter: brightness(0) invert(1);
				}
			`}</style>
		</div>
	);
}
