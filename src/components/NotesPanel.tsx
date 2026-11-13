import { type FormEvent, useState } from 'react';
import { Bell, CheckCircle2, Circle, Plus, StickyNote, Trash2 } from 'lucide-react';
import type { NoteItem, ReminderItem } from '../types/jarvis';

interface NotesPanelProps {
  notes: NoteItem[];
  reminders: ReminderItem[];
  onCreateNote: (title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onCreateReminder: (title: string, dueAtIso: string | null) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onRequestClearNotes: () => void;
  onRequestClearReminders: () => void;
}

type EntryMode = 'note' | 'reminder';
type FilterMode = 'all' | 'notes' | 'reminders';

export function NotesPanel({
  notes,
  reminders,
  onCreateNote,
  onDeleteNote,
  onCreateReminder,
  onToggleReminder,
  onDeleteReminder,
  onRequestClearNotes,
  onRequestClearReminders,
}: NotesPanelProps) {
  const [entryMode, setEntryMode] = useState<EntryMode>('note');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueLocal, setDueLocal] = useState('');
  const [confirmClearType, setConfirmClearType] = useState<'notes' | 'reminders' | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    if (entryMode === 'note') {
      onCreateNote(cleanTitle, content.trim() || cleanTitle);
      setTitle('');
      setContent('');
    } else {
      let dueIso: string | null = null;
      if (dueLocal) {
        const parsed = new Date(dueLocal);
        if (!Number.isNaN(parsed.getTime())) {
          dueIso = parsed.toISOString();
        }
      }
      onCreateReminder(cleanTitle, dueIso);
      setTitle('');
      setDueLocal('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Notes & Reminders
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create notes and scheduled reminders by voice or directly here.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notes.length > 0 && confirmClearType !== 'notes' && (
            <button
              type="button"
              onClick={() => setConfirmClearType('notes')}
              className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10"
            >
              Clear Notes ({notes.length})
            </button>
          )}
          {reminders.length > 0 && confirmClearType !== 'reminders' && (
            <button
              type="button"
              onClick={() => setConfirmClearType('reminders')}
              className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10"
            >
              Clear Reminders ({reminders.length})
            </button>
          )}
        </div>
      </div>

      {confirmClearType && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
            Permission required: permanently delete all{' '}
            {confirmClearType === 'notes' ? 'notes' : 'reminders'}?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirmClearType === 'notes') onRequestClearNotes();
                else onRequestClearReminders();
                setConfirmClearType(null);
              }}
              className="min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-500"
            >
              Allow Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearType(null)}
              className="min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              Deny
            </button>
          </div>
        </div>
      )}

      {/* Create Note / Reminder Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] p-4 space-y-3"
      >
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setEntryMode('note')}
            className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              entryMode === 'note'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('reminder')}
            className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              entryMode === 'reminder'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>New Reminder</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <label htmlFor="note-reminder-title" className="sr-only">
            {entryMode === 'note' ? 'Note title' : 'Reminder title'}
          </label>
          <input
            id="note-reminder-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              entryMode === 'note'
                ? 'Note title (e.g., Grocery list)'
                : 'Reminder (e.g., Call Mom at 6 PM)'
            }
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          {entryMode === 'reminder' && (
            <>
              <label htmlFor="reminder-due-input" className="sr-only">
                Due date and time
              </label>
              <input
                id="reminder-due-input"
                type="datetime-local"
                value={dueLocal}
                onChange={(e) => setDueLocal(e.target.value)}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </>
          )}

          <button
            type="submit"
            disabled={!title.trim()}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{entryMode === 'note' ? 'Save Note' : 'Add Reminder'}</span>
          </button>
        </div>

        {entryMode === 'note' && (
          <div>
            <label htmlFor="note-content-input" className="sr-only">
              Note details
            </label>
            <textarea
              id="note-content-input"
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Optional note details..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}
      </form>

      {/* Filter Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 w-fit">
        {(['all', 'notes', 'reminders'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilterMode(mode)}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filterMode === mode
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Reminders Section */}
      {(filterMode === 'all' || filterMode === 'reminders') && (
        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Reminders ({reminders.length})
          </h3>
          {reminders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No reminders yet. Say “Remind me in 10 minutes to stretch” or add one above.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] overflow-hidden">
              {reminders.map((rem) => (
                <li
                  key={rem.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                >
                  <button
                    type="button"
                    onClick={() => onToggleReminder(rem.id)}
                    aria-label={`Mark reminder '${rem.title}' as ${rem.completed ? 'pending' : 'done'}`}
                    className="min-h-[40px] flex items-center gap-3 text-left min-w-0 flex-1"
                  >
                    {rem.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium break-words ${
                          rem.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {rem.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {rem.dueAtIso
                          ? `Due ${new Date(rem.dueAtIso).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : 'No due time'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteReminder(rem.id)}
                    aria-label={`Delete reminder '${rem.title}'`}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Notes Section */}
      {(filterMode === 'all' || filterMode === 'notes') && (
        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Notes ({notes.length})
          </h3>
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No notes saved yet. Say “Create a note about project ideas” or write one above.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] overflow-hidden">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                >
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
                      {note.title}
                    </h4>
                    {note.content !== note.title && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">
                        {note.content}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {new Date(note.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteNote(note.id)}
                    aria-label={`Delete note '${note.title}'`}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
