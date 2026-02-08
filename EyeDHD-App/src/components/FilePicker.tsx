type Props = {
  type: string;
  id: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function FilePicker({ type, id, accept, onChange }: Props) {
  return (
    <>
      <input
        type={type}
        id={id}
        accept={accept}
        onChange={onChange}
        className="file-picker-input"
      />
    </>
  );
}
