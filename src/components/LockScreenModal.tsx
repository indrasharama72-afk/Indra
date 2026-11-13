import { type FormEvent, useState } from 'react';
import { Lock } from 'lucide-react';

interface LockScreenModalProps {
  ownerName: string;
  failedAttempts: number;
  onUnlock: (pin: string) => boolean;
}

export function LockScreenModal({
  ownerName,
  failedAttempts,
  onUnlock,
}: LockScreenModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const ok = onUnlock(pin);
    if (!ok) {
      setError('Incorrect Owner PIN. Please try again.');
      setPin('');
    } else {
      setError('');
      setPin('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-screen-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#0F1726] p-6 text-center space-y-5 shadow-2xl"
      >
        <div className="mx-auto w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 id="lock-screen-title" className="text-lg font-semibold text-white">
            JARVIS Session Locked
          </h2>
          <p className="text-xs text-slate-400">
            Enter {ownerName || 'Owner'}’s security PIN to continue.
          </p>
        </div>

        <div>
          <label htmlFor="unlock-pin-input" className="sr-only">
            Owner PIN
          </label>
          <input
            id="unlock-pin-input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-center text-lg font-mono tracking-[0.4em] text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {error && (
            <p role="alert" className="mt-2 text-xs text-rose-400">
              {error} {failedAttempts > 1 ? `(${failedAttempts} attempts)` : ''}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pin.length < 4}
          className="min-h-[48px] w-full rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Unlock JARVIS
        </button>
      </form>
    </div>
  );
}
