export default function LoadingOverlay({ isLoading }) {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
    </div>
  );
}
