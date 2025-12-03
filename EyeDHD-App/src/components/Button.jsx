export default function Button({ onClick, className, buttonText }) {
  return (
    <button className={className} onClick={onClick}>
      {buttonText}
    </button>
  );
}
