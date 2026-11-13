import { type FormEvent, useState } from 'react';
import { KeyRound, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import type { SecurityState } from '../types/jarvis';
import { validatePin } from '../utils/jarvisLogic';

interface SecurityPanelProps {
  security: SecurityState;
  onUpdateOwnerName: (name: string) => void;
  onSetPin: (pin: string) => void;
  onRemovePin: () => void;
  onLockSession: () => void;
  onToggleProtectTabs: (enabled: boolean) => void;
}

export function SecurityPanel({
  security,
  onUpdateOwnerName,
  onSetPin,
  onRemovePin,
  onLockSession,
  onToggleProtectTabs,
}: SecurityPanelProps) {
  const [ownerDraft, setOwnerDraft] = useState(security.ownerName);
  const [pinDraft, setPinDraft] = useState('');
  const [confirmPinDraft, setConfirmPinDraft] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );

  const handleSaveOwner = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = ownerDraft.trim();
    if (!cleaned) {
      setFeedback({ type: 'error', text: 'Owner name cannot be empty.' });
      return;
    }
    onUpdateOwnerName(cleaned);
    setFeedback({ type: 'success', text: 'Owner identity updated.' });
  };

  const handleSavePin = (e: FormEvent) => {
    e.preventDefault();
    const check = validatePin(pinDraft);
    if (!check.valid) {
      setFeedback({ type: 'error', text: check.error || 'Invalid PIN.' });
      return;
    }
    if (pinDraft.trim() !== confirmPinDraft.trim()) {
      setFeedback({ type: 'error', text: 'PINs do not match.' });
      return;
    }
    onSetPin(pinDraft.trim());
    setPinDraft('');
    setConfirmPinDraft('');
    setFeedback({ type: 'success', text: 'Owner security PIN saved.' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Owner Security
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage owner recognition, session PIN lock, and private memory access.
          </p>
        </div>

        {security.pinHash && (
          <button
            type="button"
            onClick={onLockSession}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 whitespace-nowrap"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Session Now</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl px-4 py-2.5 text-xs font-medium border ${
            feedback.type === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Owner Identity Card */}
      <form
        onSubmit={handleSaveOwner}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] p-5 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <UserCheck className="w-5 h-5 text-sky-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Owner Identity
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <label htmlFor="owner-name-input" className="sr-only">
            Owner Name
          </label>
          <input
            id="owner-name-input"
            type="text"
            value={ownerDraft}
            onChange={(e) => setOwnerDraft(e.target.value)}
            placeholder="Your name (e.g., Sintu)"
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 whitespace-nowrap"
          >
            Save Owner
          </button>
        </div>
      </form>

      {/* PIN Setup & Protection */}
      <form
        onSubmit={handleSavePin}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-sky-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {security.pinHash ? 'Change Owner PIN' : 'Set Owner PIN'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {security.pinHash ? 'PIN Active' : 'No PIN Set'}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="owner-pin-input"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              4–6 Digit PIN
            </label>
            <input
              id="owner-pin-input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinDraft}
              onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-6 digits"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2 text-sm font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label
              htmlFor="owner-pin-confirm"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Confirm PIN
            </label>
            <input
              id="owner-pin-confirm"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPinDraft}
              onChange={(e) => setConfirmPinDraft(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter PIN"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2 text-sm font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium bg-sky-600 text-white hover:bg-sky-500"
          >
            {security.pinHash ? 'Update PIN' : 'Enable PIN Lock'}
          </button>

          {security.pinHash && (
            <button
              type="button"
              onClick={() => {
                onRemovePin();
                setFeedback({ type: 'success', text: 'Owner PIN removed.' });
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
            >
              Disable PIN
            </button>
          )}
        </div>
      </form>

      {/* Sensitive Area Protection Toggle */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-sky-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Lock Memory & Settings on Startup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              When an Owner PIN is active, require unlocking before accessing JARVIS.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={security.protectMemoryAndSettings}
          aria-label="Lock Memory and Settings on Startup"
          onClick={() => onToggleProtectTabs(!security.protectMemoryAndSettings)}
          className={`min-h-[36px] min-w-[60px] rounded-full px-1.5 transition-colors flex items-center shrink-0 ${
            security.protectMemoryAndSettings
              ? 'bg-sky-600 justify-end'
              : 'bg-slate-300 dark:bg-slate-700 justify-start'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow" />
        </button>
      </div>
    </div>
  );
}
