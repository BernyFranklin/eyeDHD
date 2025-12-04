export default function Button({ onClick, className, buttonText, disabled = false }) {
  return (
    <button className={className} onClick={onClick} disabled={disabled}>
      {buttonText}
    </button>
  );
}
