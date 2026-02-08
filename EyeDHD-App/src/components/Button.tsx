type Props = {
  onClick: (() => Promise<void>) | (() => void) | ((e: Event) => void);
  className?: string;
  buttonText: string;
  disabled?: boolean;
  type?: 'submit' | 'reset' | 'button' | undefined;
  style?: React.CSSProperties;
};

export default function Button({
  onClick,
  className = '',
  buttonText,
  disabled = false,
  type = 'button'
}: Props) {
  return (
    <button
      type={type}
      className={className}
      onClick={onClick as () => void}
      disabled={disabled}
    >
      {buttonText}
    </button>
  );
}
