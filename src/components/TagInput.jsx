import { useState, useRef } from 'react';
import { X } from 'lucide-react';

export default function TagInput({
  tags = [],
  onChange,
  placeholder = 'Add a tag and press Enter',
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove) => {
    if (disabled) return;
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="input-group">
      <label>Tags</label>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--neutral-0)',
          border: 'var(--border-light)',
          borderRadius: 'var(--radius-md)',
          minHeight: '42px',
          alignItems: 'center',
          cursor: 'text',
        }}
        onClick={() => inputRef.current?.focus()}
        id="tag-input-container"
      >
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                title={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled}
          style={{
            flex: '1',
            minWidth: '100px',
            border: 'none',
            outline: 'none',
            padding: 'var(--space-1) 0',
            fontSize: 'var(--text-sm)',
            background: 'transparent',
          }}
          id="tag-text-input"
        />
      </div>
    </div>
  );
}
