/**
 * Reusable "Visibility Gate" selector required on every creation form.
 * Forces the author to explicitly pick Public or Followers Only — no default.
 */
export default function VisibilityPicker({ value, onChange, error }) {
  const options = [
    {
      value: 'public',
      icon: 'public',
      label: 'Public',
      desc: 'Anyone on Fursahub can see this.',
    },
    {
      value: 'followers',
      icon: 'lock',
      label: 'Followers Only',
      desc: 'Only people who follow you can see this.',
    },
  ];

  return (
    <div>
      <label className="block font-label-sm text-outline mb-xs uppercase">
        Who can see this? <span className="text-red-600">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`text-left p-md rounded-xl border-2 transition-all flex items-start gap-sm ${
                active
                  ? 'bg-white shadow-sm'
                  : 'bg-white/60 hover:bg-white border-outline-variant'
              }`}
              style={active ? { borderColor: '#059669' } : undefined}
            >
              <span
                className="material-symbols-outlined text-[20px] mt-[2px]"
                style={{ color: active ? '#059669' : '#6b7280' }}
              >
                {opt.icon}
              </span>
              <div>
                <p className="font-bold text-body-sm" style={{ color: active ? '#059669' : '#111827' }}>
                  {opt.label}
                </p>
                <p className="text-label-sm text-on-surface-variant mt-[2px]">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="text-red-600 text-label-sm mt-xs">{error}</p>}
    </div>
  );
}
