import { QUESTION_TYPE_LIST } from '../lib/constants';
import { CircleDot, CheckSquare, Type, AlignLeft } from 'lucide-react';

const ICONS = {
  CircleDot,
  CheckSquare,
  Type,
  AlignLeft,
};

export default function QuestionTypeSelector({
  selected = [],
  onChange,
  disabled = false,
}) {
  const toggleType = (typeValue) => {
    if (disabled) return;
    if (selected.includes(typeValue)) {
      onChange(selected.filter((t) => t !== typeValue));
    } else {
      onChange([...selected, typeValue]);
    }
  };

  const toggleAll = () => {
    if (disabled) return;
    if (selected.length === QUESTION_TYPE_LIST.length) {
      onChange([]);
    } else {
      onChange(QUESTION_TYPE_LIST.map((t) => t.value));
    }
  };

  return (
    <div className="input-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label>Question Types</label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={toggleAll}
          disabled={disabled}
          id="btn-toggle-all-types"
        >
          {selected.length === QUESTION_TYPE_LIST.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
        {QUESTION_TYPE_LIST.map((type) => {
          const Icon = ICONS[type.icon];
          const isSelected = selected.includes(type.value);

          return (
            <div
              key={type.value}
              className={`checkbox-item ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleType(type.value)}
              id={`type-${type.value.toLowerCase()}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleType(type.value)}
                disabled={disabled}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {Icon && <Icon size={14} />}
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
                    {type.label}
                  </span>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                  {type.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
