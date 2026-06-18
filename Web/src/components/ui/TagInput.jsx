import { useState } from 'react';

export default function TagInput({ tags = [], onChange, suggestions = [] }) {
  const [input, setInput] = useState('');
  const [showSugg, setShowSugg] = useState(false);

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
        className="min-h-[48px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 flex flex-wrap gap-1.5 items-center focus-within:border-primary-400"
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
          >
            #{tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-primary-400 hover:text-primary-600 leading-none"
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
          onFocus={() => setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 150)}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          className="flex-1 min-w-[80px] text-sm text-gray-800 dark:text-gray-200 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>
      {showSugg && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {filtered.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(s); }}
              className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 active:bg-primary-100"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">Press Enter or comma to add a tag</p>
    </div>
  );
}
