import { useState } from 'react';

export default function TagInput({ tags = [], onChange, suggestions = [] }) {
  const [input, setInput] = useState('');
  const [showSugg, setShowSugg] = useState(false);
  const [focused, setFocused] = useState(false);

  const filtered = input.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s))
    : suggestions.filter((s) => !tags.includes(s)).slice(0, 8);

  function add(tag) {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setInput('');
    setShowSugg(false);
  }

  function remove(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex flex-wrap gap-1.5 items-center"
        style={{
          minHeight: 48,
          padding: '8px 12px',
          borderRadius: 10,
          background: '#F0F2F7',
          border: `1.5px solid ${focused ? '#00C2B2' : '#E9ECF0'}`,
          transition: 'border-color 0.15s',
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1"
            style={{
              background: '#E6FAF9',
              color: '#009E90',
              borderRadius: 20,
              padding: '3px 10px 3px 8px',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            #{tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              style={{
                color: '#B0B8C4',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1,
                padding: 0,
                fontSize: 14,
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSugg(true); }}
          onKeyDown={handleKey}
          onFocus={() => { setFocused(true); setShowSugg(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setShowSugg(false), 150); }}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          style={{
            flex: 1,
            minWidth: 80,
            fontSize: 14,
            color: '#0A0D14',
            background: 'transparent',
            border: 'none',
            outline: 'none',
          }}
        />
      </div>
      {showSugg && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {filtered.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(s); }}
              style={{
                padding: '2px 8px',
                borderRadius: 99,
                fontSize: 12,
                background: '#E9ECF0',
                color: '#374151',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              #{s}
            </button>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: '#B0B8C4' }}>Press Enter or comma to add a tag</p>
    </div>
  );
}
