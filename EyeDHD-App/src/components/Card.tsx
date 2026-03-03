import React from 'react';

type Props = {
	title: string;
	img: string;
	className: string;
};

export default function Card({ title, img, className }: Props) {
	return (
		<div className={`card card-single ${className}`}>
			<p>{title}</p>
			<img src={img} alt={title} className="card-image" />
			<style>{`
				.card.card-single {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					width: 200px;
					height: 250px;
					background-color: #13284c;
					color: #fff;
					font-weight: bold;
					border-radius: var(--action-radius);
					margin: 20px;
					padding: 10px;
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
