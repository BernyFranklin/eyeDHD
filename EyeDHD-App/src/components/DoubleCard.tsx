const cardStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '300px',
  height: '250px',
  backgroundColor: '#13284c',
  color: '#fff',
  fontWeight: 'bold',
  borderRadius: '10%',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.9)',
  margin: '20px',
  padding: '10px'
};

const imgStyles = {
  width: '100px',
  color: 'white',
  filter: 'brightness(0) invert(1)'
};

type Props = {
  title: string;
  img1: string;
  img2: string;
};

export default function DoubleCard({ title, img1, img2 }: Props) {
  return (
    <div className="card" style={cardStyles as React.CSSProperties}>
      <p>{title}</p>
      <div style={{ display: 'inline-block' }}>
        <img src={img1} alt={title} style={imgStyles} />
        <img src={img2} alt={title} style={imgStyles} />
      </div>
    </div>
  );
}
