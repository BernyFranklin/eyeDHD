export default function FilePicker({ type, id, accept, onChange }) {
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
