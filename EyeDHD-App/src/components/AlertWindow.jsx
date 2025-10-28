export default function AlertWindow({ message, onClose, classColor }) {
    return (
        <div className={`alert-window ${classColor}`}>
            <p>{message}</p>
            <button onClick={onClose}>Close</button>
        </div>
    );
}
