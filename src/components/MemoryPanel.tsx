import { type FormEvent, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import type { MemoryCategory, MemoryItem } from '../types/jarvis';

interface MemoryPanelProps {
  memories: MemoryItem[];
  onAddMemory: (content: string, category: MemoryCategory) => void;
  onDeleteMemory: (id: string) => void;
  onClearAll: () => void;
}

const CATEGORIES: Array<{ value: MemoryCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'preference', label: 'Preferences' },
  { value: 'work', label: 'Work' },
  { value: 'instruction', label: 'Instructions' },
];

export function MemoryPanel({
  memories,
  onAddMemory,
  onDeleteMemory,
  onClearAll,
}: MemoryPanelProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('personal');
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onAddMemory(trimmed, category);
    setContent('');
  };

  const filtered = memories.filter((item) => {
    const matchesCat = filterCategory === 'all' || item.category === filterCategory;
    const matchesQuery =
      !search.trim() ||
      item.content.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Memory Vault
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Facts, preferences, and instructions JARVIS uses across conversations.
          </p>
        </div>

        {memories.length > 0 && (
          <div>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-500"
                >
                  Confirm Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10"
              >
                Clear All ({memories.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add New Memory Form */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] p-4 space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-2.5">
          <label htmlFor="new-memory-input" className="sr-only">
            New memory note
          </label>
          <input
            id="new-memory-input"
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a memory (e.g., Speak to me in Hinglish by default)"
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <label htmlFor="new-memory-category" className="sr-only">
            Memory category
          </label>
          <select
            id="new-memory-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MemoryCategory)}
            className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="personal">Personal</option>
            <option value="preference">Preference</option>
            <option value="work">Work</option>
            <option value="instruction">Instruction</option>
          </select>

          <button
            type="submit"
            disabled={!content.trim()}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Save Memory</span>
          </button>
        </div>
      </form>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFilterCategory(cat.value)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat.value
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-60">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="memory-search" className="sr-only">
            Search memories
          </label>
          <input
            id="memory-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="min-h-[40px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] pl-9 pr-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Memory List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {memories.length === 0
              ? 'No memories saved yet'
              : 'No memories match your filter'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add a memory above or ask JARVIS to remember something in chat.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] overflow-hidden">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-slate-900 dark:text-slate-100 break-words">
                  {item.content}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="capitalize">{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteMemory(item.id)}
                aria-label={`Delete memory '${item.content}'`}
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
