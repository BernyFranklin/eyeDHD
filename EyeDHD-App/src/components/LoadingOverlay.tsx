import React from 'react';

type Props = {
  isLoading: boolean;
};

export default function LoadingOverlay({ isLoading }: Props) {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
    </div>
  );
}
