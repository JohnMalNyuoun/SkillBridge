import { useEffect, useRef, useState } from 'react';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';

/**
 * Compact language switcher. Two variants:
 *   - "icon" (default): globe icon + flag, opens a dropdown. Use in TopNav.
 *   - "list": full-width tiles. Use in Settings.
 */
export default function LanguageSwitcher({ variant = 'icon' }) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (variant === 'list') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
        {LANGUAGES.map((l) => {
          const active = l.code === language;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={`text-left p-md rounded-xl border-2 transition-all ${
                active ? 'border-emerald-600 bg-emerald-50' : 'border-outline-variant hover:border-emerald-300'
              }`}
            >
              <div className="text-2xl mb-xs" aria-hidden>{l.flag}</div>
              <p className={`font-label-md ${active ? 'font-bold text-emerald-700' : ''}`}>{l.label}</p>
              <p className="text-label-sm text-on-surface-variant">{l.nativeLabel}</p>
            </button>
          );
        })}
      </div>
    );
  }

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change language"
        aria-label="Change language"
        aria-expanded={open}
        className="flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors px-xs"
      >
        <span className="material-symbols-outlined">language</span>
        <span className="hidden sm:inline text-label-sm font-bold uppercase">{current.code}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-xs w-48 bg-surface border border-outline-variant rounded-lg shadow-lg overflow-hidden z-50"
        >
          {LANGUAGES.map((l) => {
            const active = l.code === language;
            return (
              <button
                key={l.code}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { setLanguage(l.code); setOpen(false); }}
                className={`w-full text-left flex items-center gap-sm px-sm py-xs hover:bg-surface-container-low ${
                  active ? 'bg-emerald-50 text-emerald-700 font-bold' : ''
                }`}
              >
                <span className="text-lg" aria-hidden>{l.flag}</span>
                <span className="flex-1 text-label-md">{l.label}</span>
                <span className="text-label-sm text-on-surface-variant">{l.nativeLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
