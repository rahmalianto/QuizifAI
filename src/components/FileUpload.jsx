import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { extractText } from '../lib/extractText';
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from '../lib/constants';
import toast from 'react-hot-toast';

export default function FileUpload({ onTextExtracted, disabled = false }) {
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const isValidFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type: ${ext}. Use .md, .pdf, or .docx`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.');
      return false;
    }
    return true;
  };

  const handleFile = useCallback(
    async (file) => {
      if (!isValidFile(file)) return;

      setSelectedFile(file);
      setExtracting(true);

      try {
        const text = await extractText(file);
        if (!text || text.trim().length === 0) {
          toast.error('No text could be extracted from this file.');
          setSelectedFile(null);
          return;
        }
        onTextExtracted(text);
        toast.success(`Extracted ${text.length.toLocaleString()} characters from ${file.name}`);
      } catch (err) {
        console.error('Extraction error:', err);
        toast.error(`Failed to extract text: ${err.message}`);
        setSelectedFile(null);
      } finally {
        setExtracting(false);
      }
    },
    [onTextExtracted]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled && !extracting) {
      inputRef.current?.click();
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
  };

  return (
    <div
      className={`upload-zone ${dragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      id="file-upload-zone"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".md,.pdf,.docx"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        id="file-upload-input"
      />

      {extracting ? (
        <>
          <div className="upload-icon">
            <div className="spinner">
              <div className="spinner-circle"></div>
            </div>
          </div>
          <h4>Extracting text from {selectedFile?.name}...</h4>
          <p>This may take a moment for large files</p>
        </>
      ) : selectedFile ? (
        <>
          <div className="upload-icon" style={{ background: 'var(--success-50)', color: 'var(--success-500)' }}>
            <FileText size={24} />
          </div>
          <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {selectedFile.name}
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearFile}
              title="Remove file"
              style={{ padding: '2px' }}
            >
              <X size={14} />
            </button>
          </h4>
          <p>Click or drag to replace</p>
        </>
      ) : (
        <>
          <div className="upload-icon">
            <Upload size={24} />
          </div>
          <h4>Drop your file here, or click to browse</h4>
          <p>Supports PDF, DOCX, and Markdown files (up to 10MB)</p>
          <div className="file-types">
            <span className="badge badge-neutral">.pdf</span>
            <span className="badge badge-neutral">.docx</span>
            <span className="badge badge-neutral">.md</span>
          </div>
        </>
      )}
    </div>
  );
}
