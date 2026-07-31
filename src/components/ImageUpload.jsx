import { useState, useRef, useCallback, useEffect } from 'react';
import { ImagePlus, Upload, Clipboard, X } from 'lucide-react';
import { compressImage, getSignedImageUrl } from '../services/imageService';

const MAX_IMAGE_SIZE = 250 * 1024; // 250KB limit
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export default function ImageUpload({ onImageReady, onFileReady, initialImageUrl, label, compact }) {
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Load initial image (support private path signed URL)
  useEffect(() => {
    if (initialImageUrl) {
      if (initialImageUrl.startsWith('http')) {
        setPreview(initialImageUrl);
      } else {
        getSignedImageUrl(initialImageUrl).then(url => {
          if (url) setPreview(url);
        });
      }
    } else {
      setPreview(null);
    }
  }, [initialImageUrl]);

  const processFile = useCallback(async (file) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported image type. Use PNG, JPG, WebP, or GIF.');
      return;
    }

    try {
      setProcessing(true);
      const compressedFile = await compressImage(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedFile);
      setPreview(previewUrl);

      // Trigger callbacks
      onFileReady?.(compressedFile);

      if (onImageReady) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          onImageReady({ base64, mimeType: compressedFile.type });
        };
        reader.readAsDataURL(compressedFile);
      }
    } catch (err) {
      setError('Failed to process image. Please try another file.');
      console.error('Image processing error:', err);
    } finally {
      setProcessing(false);
    }
  }, [onImageReady, onFileReady]);

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
    onImageReady?.(null);
    onFileReady?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isCompact = !!compact;

  if (preview) {
    return (
      <div className="animate-in" style={{ position: 'relative' }}>
        {label && <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-600)', marginBottom: 'var(--space-1)', display: 'block' }}>{label}</label>}
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
              maxHeight: isCompact ? '120px' : '400px',
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
              width: '28px',
              height: '28px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-600)', marginBottom: 'var(--space-1)', display: 'block' }}>{label}</label>}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--primary-400)' : 'var(--neutral-300)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: isCompact ? 'var(--space-4) var(--space-2)' : 'var(--space-10) var(--space-6)',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--primary-50)' : 'var(--neutral-50)',
          transition: 'all 0.2s ease',
        }}
      >
        {processing ? (
          <div>
            <div className="spinner" style={{ margin: '0 auto var(--space-2)' }}>
              <div className="spinner-circle" style={{ width: '24px', height: '24px', borderWidth: '2px' }}></div>
            </div>
            <p style={{ color: 'var(--neutral-600)', fontSize: 'var(--text-xs)' }}>
              Processing...
            </p>
          </div>
        ) : (
          <>
            {!isCompact && (
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
            )}
            <p style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-800)', fontSize: isCompact ? 'var(--text-xs)' : 'var(--text-md)', marginBottom: 'var(--space-1)' }}>
              {isCompact ? 'Click to add image' : 'Drop an image here, or click to browse'}
            </p>
            {!isCompact && (
              <>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)', marginBottom: 'var(--space-4)' }}>
                  PNG, JPG, WebP, or GIF — resized to max 1280px for AI processing
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
          </>
        )}
      </div>

      {error && (
        <p style={{ color: 'var(--danger-500)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
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
