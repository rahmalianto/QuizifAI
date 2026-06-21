import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTags } from '../hooks/useTags';
import toast from 'react-hot-toast';

export default function TagInput({
  tags = [],
  onChange,
  placeholder = 'Search tags...',
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { tags: existingTags, fetchTags } = useTags();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const filteredTags = existingTags.filter(
    (t) => t.name.includes(inputValue.trim().toLowerCase()) && !tags.includes(t.name)
  );

  const addTag = (tagName) => {
    const trimmed = tagName.trim().toLowerCase();
    if (!trimmed) return;
    
    // Check if it exists in the database
    const exists = existingTags.some(t => t.name === trimmed);
    
    if (exists) {
      if (!tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInputValue('');
      setShowDropdown(false);
    } else {
      // Not found, redirect to tags menu
      toast('Tag not found. Redirecting to Tags page...', { icon: '🏷️' });
      navigate('/tags');
    }
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
    <div className="input-group" style={{ position: 'relative' }}>
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
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
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

      {showDropdown && inputValue.trim() && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--neutral-0)',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          zIndex: 10,
          maxHeight: '200px',
          overflowY: 'auto',
          marginTop: '4px'
        }}>
          {filteredTags.length > 0 ? (
            filteredTags.map(tag => (
              <div 
                key={tag.id}
                onClick={() => addTag(tag.name)}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--neutral-100)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--neutral-50)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span>{tag.name}</span>
                {tag.description && <span style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>{tag.description}</span>}
              </div>
            ))
          ) : (
            <div style={{
              padding: 'var(--space-2) var(--space-3)',
              color: 'var(--neutral-500)',
              fontSize: 'var(--text-sm)',
              fontStyle: 'italic'
            }}>
              Tag not found. Press Enter to go create it.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
