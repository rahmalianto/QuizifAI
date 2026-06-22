import { useState, useRef, useCallback, useEffect } from 'react';
import { ImagePlus, Upload, Clipboard, X } from 'lucide-react';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB base64 limit
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/**
 * Resize an image if its base64 exceeds the max size.
 * Returns { base64, mimeType }.
 */
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Check if raw base64 is already small enough
        const rawBase64 = reader.result.split(',')[1];
        if (rawBase64.length <= MAX_IMAGE_SIZE) {
          resolve({ base64: rawBase64, mimeType: file.type });
          return;
        }

        // Need to resize — scale down proportionally
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const scaleFactor = Math.sqrt(MAX_IMAGE_SIZE / rawBase64.length) * 0.9; // 90% of target to leave headroom
        width = Math.round(width * scaleFactor);
        height = Math.round(height * scaleFactor);
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const resizedBase64 = dataUrl.split(',')[1];
        resolve({ base64: resizedBase64, mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({ onImageReady }) {
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported image type. Use PNG, JPG, WebP, or GIF.');
      return;
    }

    try {
      setProcessing(true);
      const { base64, mimeType } = await resizeImage(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      onImageReady({ base64, mimeType });
    } catch (err) {
      setError('Failed to process image. Please try another file.');
      console.error('Image processing error:', err);
    } finally {
      setProcessing(false);
    }
  }, [onImageReady]);

  // Clipboard paste handler
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await processFile(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFile]);

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleClear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    onImageReady(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (preview) {
    return (
      <div className="animate-in" style={{ position: 'relative' }}>
        <div
          style={{
            border: '2px solid var(--primary-200)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--neutral-50)',
            position: 'relative',
          }}
        >
          <img
            src={preview}
            alt="Uploaded preview"
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <button
            onClick={handleClear}
            className="btn btn-ghost btn-icon btn-sm"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
            }}
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
        <p style={{
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--success-600)',
          marginTop: 'var(--space-2)',
          fontWeight: 'var(--weight-medium)',
        }}>
          ✓ Image ready for question generation
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--primary-400)' : 'var(--neutral-300)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-10) var(--space-6)',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--primary-50)' : 'var(--neutral-50)',
          transition: 'all 0.2s ease',
        }}
      >
        {processing ? (
          <div>
            <div className="spinner" style={{ margin: '0 auto var(--space-3)' }}>
              <div className="spinner-circle" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
            </div>
            <p style={{ color: 'var(--neutral-600)', fontWeight: 'var(--weight-medium)' }}>
              Processing image...
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--primary-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
                color: 'var(--primary-500)',
              }}
            >
              <ImagePlus size={28} />
            </div>
            <p style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-800)', marginBottom: 'var(--space-1)' }}>
              Drop an image here, or click to browse
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)', marginBottom: 'var(--space-4)' }}>
              PNG, JPG, WebP, or GIF — max 4MB
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
              <span
                className="btn btn-secondary btn-sm"
                style={{ pointerEvents: 'none' }}
              >
                <Upload size={14} /> Choose File
              </span>
              <span
                className="btn btn-ghost btn-sm"
                style={{ pointerEvents: 'none' }}
              >
                <Clipboard size={14} /> or Paste (Ctrl+V)
              </span>
            </div>
          </>
        )}
      </div>

      {error && (
        <p style={{ color: 'var(--danger-500)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}
