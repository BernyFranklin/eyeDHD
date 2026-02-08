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
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.9)',
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
};

export default function Card({ title, img }: Props) {
  return (
    <div className="card" style={cardStyles}>
      <p>{title}</p>
      <img src={img} alt={title} style={imgStyles} />
    </div>
  );
}
