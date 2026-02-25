import React from 'react';

const cardStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '200px',
  height: '250px',
  backgroundColor: '#13284c',
  color: '#fff',
  fontWeight: 'bold',
  borderRadius: '10%',
  margin: '20px',
  padding: '10px'
} as React.CSSProperties;

const imgStyles = {
  width: '100px',
  color: 'white',
  filter: 'brightness(0) invert(1)'
};

type Props = {
  title: string;
  img: string;
  className: string;
};

export default function Card({ title, img, className }: Props) {
  return (
    <div className={`card ${className}`} style={cardStyles}>
      <p>{title}</p>
      <img src={img} alt={title} style={imgStyles} />
    </div>
  );
}
