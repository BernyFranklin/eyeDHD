import React from 'react';

type Props = {
  message: string;
  onClose: () => void;
  classColor: string;
};

export default function AlertWindow({ message, onClose, classColor }: Props) {
  return (
    <div className={`alert-window ${classColor}`}>
      <p>{message}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
