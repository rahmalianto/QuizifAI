export default function LoadingSpinner({ size = 'default', text = '' }) {
  return (
    <div className="loading-screen">
      <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`}>
        <div className="spinner-circle"></div>
      </div>
      {text && <p>{text}</p>}
    </div>
  );
}
